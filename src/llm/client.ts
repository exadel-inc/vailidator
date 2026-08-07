import OpenAI from 'openai'
import type { LighthouseResult } from '../lighthouse/runner.js'
import AuditReportJsonSchema from './audit-report-json-schema.js'

export interface AuditItem {
  id: string
  title: string
  status: 'pass' | 'fail' | 'warning'
  description: string
  recommendation?: string
}

export interface ValidationRuleResult {
  rule: string
  status: 'pass' | 'fail' | 'warning'
  description: string
  recommendation?: string
}

export interface AuditReport {
  seo: AuditItem[]
  accessibility: AuditItem[]
  validation: ValidationRuleResult[]
  summary: string
}

export interface AnalyzeParams {
  markup: string
  rules: string[]
  lighthouseResult: LighthouseResult
}

const AuditReportSchema = {
  seo: [
    {
      id: 'string',
      title: 'string',
      status: "'pass' | 'fail' | 'warning'",
      description: 'string',
      recommendation: 'string (optional)',
    },
  ],
  accessibility: [
    {
      id: 'string',
      title: 'string',
      status: "'pass' | 'fail' | 'warning'",
      description: 'string',
      recommendation: 'string (optional)',
    },
  ],
  validation: [
    {
      rule: 'string (the original rule text)',
      status: "'pass' | 'fail' | 'warning'",
      description: 'string',
      recommendation: 'string (optional)',
    },
  ],
  summary: 'string (2-3 sentence overall summary of the audit)',
}

/**
 * Sends the markup, validation rules, and Lighthouse findings to the LLM and
 * parses its JSON response into an AuditReport.
 */
export async function analyzeWithLLM(params: AnalyzeParams): Promise<AuditReport> {
  const baseURL = process.env.LLM_BASE_URL ?? 'http://localhost:1234/v1'
  const apiKey = process.env.LLM_API_KEY ?? 'local'
  const model = process.env.LLM_MODEL ?? 'model-name'

  const client = new OpenAI({
    baseURL,
    apiKey,
    timeout: 300_000, // 5 min: reasoning models over slow tunnels can take a while
    maxRetries: 3,
    fetch: (url, init) => fetch(url, init),
  })
  const prompt = buildPrompt(params)

  console.log('Sending markup + Lighthouse results to LLM...')
  const startedAt = Date.now()
  let content: string
  try {
    const response = await client.chat.completions.create({
      model,
      stream: false,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.2,
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'AuditReport',
          strict: true,
          schema: AuditReportJsonSchema,
        },
      },
    })
    content = response.choices[0]?.message?.content ?? ''
  } catch (err) {
    throw new Error(`LLM analysis failed: ${(err as Error).message}`, { cause: err })
  }
  console.log(`LLM responded in ${((Date.now() - startedAt) / 1000).toFixed(1)}s`)

  try {
    return JSON.parse(extractJson(content)) as AuditReport
  } catch (err) {
    console.error('LLM returned invalid JSON. Raw response:\n', content)
    throw new Error(`Failed to parse LLM JSON response: ${(err as Error).message}`, { cause: err })
  }
}

/**
 * LLMs often wrap JSON in a ```json ... ``` code fence or add prose around it.
 * Extract the JSON payload before parsing.
 */
function extractJson(content: string): string {
  const trimmed = content.trim()
  const fence = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/)
  if (fence) return fence[1].trim()
  const start = trimmed.indexOf('{')
  const end = trimmed.lastIndexOf('}')
  if (start !== -1 && end !== -1 && end > start) return trimmed.slice(start, end + 1)
  return trimmed
}

const MAX_MARKUP_CHARS = 20_000

function buildPrompt(params: AnalyzeParams): string {
  const markup =
    params.markup.length > MAX_MARKUP_CHARS
      ? `${params.markup.slice(0, MAX_MARKUP_CHARS)}\n\n[truncated: ${params.markup.length - MAX_MARKUP_CHARS} characters omitted]`
      : params.markup

  return `
    You are an expert web accessibility and SEO auditor. You are given an HTML page and a list of plain-text validation rules. Produce a structured audit report as JSON.

    ## HTML markup
    \`\`\`html
    ${markup}
    \`\`\`

    ## Validation rules
    ${params.rules.map((rule, index) => `${index + 1}. ${rule}`).join('\n')}

    ## Lighthouse findings (failed audits only)
    ${JSON.stringify(params.lighthouseResult)}

    Evaluate each validation rule against the markup and the Lighthouse findings. Also convert the Lighthouse findings into audit items. Respond with ONLY a valid JSON object matching this exact schema:
    ${JSON.stringify(AuditReportSchema, null, 2)}
  `.trim()
}
