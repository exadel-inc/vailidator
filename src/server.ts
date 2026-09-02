import 'dotenv/config'
import path from 'path'
import express from 'express'
import { fileURLToPath } from "url";
import { clientLog, initStream, endStream, failStream } from './helpers/stream.js'
import { accessControlHeadersMiddleware } from './middleware/access-control-headers.js'
import runCopilot from './agent/agent.js';
import type { AgentRequestData } from './types/agent-request.types.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const port = Number(process.env.PORT ?? 3000)
const app = express()

app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, "../public")));
app.use('/ui-assets', express.static(path.join(__dirname, '../dist-ui')));

app.use(accessControlHeadersMiddleware);

app.post('/audit', async (req, res) => {
  const { markup, rules, pageUrl } = (req.body ?? {}) as { markup?: string; rules?: string[]; pageUrl?: string };

  if (typeof markup !== 'string' || markup.length === 0) {
    res.status(400).send('Bad request: "markup" must be a non-empty string');
    return
  }
  if (!Array.isArray(rules) || rules.length === 0 || rules.some((rule) => typeof rule !== 'string')) {
    res.status(400).send('Bad request: "rules" must be a non-empty array of strings');
    return
  }
  if (typeof pageUrl !== 'string' || pageUrl.length === 0) {
    res.status(400).send('Bad request: "pageUrl" must be a non-empty string');
    return
  }

  // Initialize the SSE stream for this request; clientLog writes into it.
  // If the client disconnects (closes/refreshes the page), abort the agent.
  const abortController = new AbortController();
  initStream(res, () => abortController.abort())
  clientLog(`Received audit request request for page: ${pageUrl}`)
  clientLog(`Markup length: ${markup.length} bytes`)
  clientLog(`Received ${rules.length} rules`)

  const stringRules = rules as string[];

  try {
    clientLog(`Analyzing with LLM using model ${process.env.COPILOT_MODEL || process.env.CUSTOM_PROVIDER_MODEL || "auto"}...`)
    const AgentRequestData: AgentRequestData = {
      markup,
      rules: stringRules,
      pageUrl,
    };

    const agentResponse = await runCopilot(AgentRequestData, abortController.signal);

    clientLog(`LLM analysis finished.`);
    clientLog(`Sending report to the client.`)

    endStream(agentResponse)
    clientLog(`Done.`)
  } catch (err) {
    if (abortController.signal.aborted) {
      clientLog(`Audit cancelled — client disconnected.`, 'info')
      return
    }
    const message = (err as Error).message
    clientLog(`Failed: ${message}`, 'error')
    failStream(message)
  }
})

app.listen(port, () => {
  console.log(`Server listening on http://localhost:${port}`)
})
