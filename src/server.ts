import 'dotenv/config'
import express from 'express'
import { generateHtmlReport } from './report/generator.js'
import { getAuditor, getAuditorName } from './agent/index.js'

const app = express()
app.use(express.json({ limit: '10mb' }))

app.post('/audit', async (req, res) => {
  const { markup, rules } = (req.body ?? {}) as { markup?: unknown; rules?: unknown }

  if (typeof markup !== 'string' || markup.length === 0) {
    res.status(400).send('Bad request: "markup" must be a non-empty string');
    return
  }
  if (!Array.isArray(rules) || rules.length === 0 || rules.some((rule) => typeof rule !== 'string')) {
    res.status(400).send('Bad request: "rules" must be a non-empty array of strings');
    return
  }

  const stringRules = rules as string[];

  try {
    console.log(`[audit] Received request (${markup.length} bytes, ${stringRules.length} rules)`)
    console.log(`[audit] Auditor: ${getAuditorName()}`)

    console.log('[audit] Analyzing with LLM...')
    const prompt = `Validate the following HTML markup with the provided validation rules:\n\n<html_markup>:\n${markup}\n</html_markup>\n<validation_rules>:\n${stringRules.join('\n')}\n</validation_rules>`;

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

app.post('/agent', async (req, res) => {
  try {
    const markup = req.body.markup as string | undefined;
    const rules = req.body.rules as string[] | undefined;
    const prompt = `Validate the following HTML markup with the provided validation rules:\n\n<html_markup>:\n${markup}\n</html_markup>\n<validation_rules>:\n${rules?.join('\n')}\n</validation_rules>`;
    const response = await getAuditor()(prompt);
    res.json(response);
  } catch (err) {
    console.error('Auditor agent failed:', err)
    res.status(500).json({ message: 'Auditor agent failed', error: (err as Error).message });
  }
});

const port = Number(process.env.PORT ?? 3000)
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
