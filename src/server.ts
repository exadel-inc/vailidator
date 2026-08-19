import 'dotenv/config'
import path from 'path'
import { fileURLToPath } from "url";
import express from 'express'
import { generateHtmlReport } from './report/generator.js'
import { getAuditor, getAuditorName } from './agents/index.js'
import { accessControlHeadersMiddleware } from './middleware/access-control-headers.js'

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

  console.log(`\n[audit] Received request for page: ${pageUrl}`)
  console.log(`[audit] Markup length: ${markup.length} bytes`)
  console.log(`[audit] Received ${rules.length} rules\n`)

  const stringRules = rules as string[];

  try {
    console.log(`[audit] Received request (${markup.length} bytes, ${stringRules.length} rules)`)
    console.log(`[audit] Auditor: ${getAuditorName()}`)

    console.log('[audit] Analyzing with LLM...')
    const prompt = `Validate the following HTML markup with the provided validation rules. Take into account that page url: <page_url>${pageUrl}</page_url>\n\n<html_markup>:\n${markup}\n</html_markup>\n<validation_rules>:\n${stringRules.join('\n')}\n</validation_rules>`;

    const runAuditor = getAuditor();
    const agentResponse = await runAuditor(prompt);
    console.log('[audit] LLM analysis finished.');

    console.log('[audit] Generating HTML report...')
    const html = generateHtmlReport(agentResponse);

    console.log('[audit] Done.')
    res.type('html').send(html)
  } catch (err) {
    console.error('[audit] Failed:', err)
    const message = (err as Error).message
    res.status(500).type('html').send(
      `<!DOCTYPE html>
      <html lang="en">
        <head><meta charset="UTF-8"><title>Audit failed</title></head>
        <body style="font-family: sans-serif; padding: 2rem;">
          <h1>Audit failed</h1>
          <pre style="background: #f1f5f9; padding: 1rem; border-radius: 8px;">${escapeHtml(message)}</pre>
        </body>
      </html>`
    )
  }
})

app.listen(port, () => {
  console.log(`Server listening on http://localhost:${port}`)
})

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}
