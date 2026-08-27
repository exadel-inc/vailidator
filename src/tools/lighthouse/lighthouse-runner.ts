import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import http from 'node:http'
import puppeteer, { type Browser } from 'puppeteer'
import lighthouse from 'lighthouse'
import serveStatic from 'serve-static'

import type { AddressInfo } from 'node:net'
import type { LighthouseAuditEntry, LighthouseResult } from '../../types/lighthouse.types.js'

export const LIGHTHOUSE_DESCRIPTION = 'Run Lighthouse SEO and accessibility audits against supplied HTML. Use this when the user asks to audit, validate, or inspect a web page.';
export const LIGHTHOUSE_TOOL_NAME = 'lighthouse';

export interface ServedPage {
  url: string
  cleanup: () => Promise<void>
}

type LighthouseFlags = NonNullable<Parameters<typeof lighthouse>[1]>
type LighthouseConfig = NonNullable<Parameters<typeof lighthouse>[2]>

/**
 * Writes the markup to a temp file and starts a local HTTP server that serves it.
 * Returns the URL plus a cleanup function that closes the server and removes the temp dir.
 */
export async function serveHtml(markup: string): Promise<ServedPage> {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'html-validation-'))
  const filePath = path.join(dir, 'index.html')
  fs.writeFileSync(filePath, markup, 'utf8')

  const serve = serveStatic(dir)
  const server = http.createServer((req, res) => {
    serve(req, res, () => {
      res.writeHead(404, { 'Content-Type': 'text/plain' })
      res.end('Not found')
    })
  })

  await new Promise<void>((resolve, reject) => {
    server.once('error', reject)
    server.listen(0, '127.0.0.1', resolve)
  })

  const address = server.address() as AddressInfo
  const url = `http://127.0.0.1:${address.port}/index.html`

  return {
    url,
    cleanup: async () => {
      await new Promise<void>((resolve) => server.close(() => resolve()))
      fs.rmSync(dir, { recursive: true, force: true })
    },
  }
}

/**
 * Runs a Lighthouse audit (SEO + accessibility only) against the given markup.
 * Returns the failed audits for each category, cleaned up on both success and error.
 */
export async function runLighthouse(markup: string): Promise<LighthouseResult> {
  const served = await serveHtml(markup)
  let browser: Browser | undefined

  try {
    browser = await puppeteer.launch({
      args: ['--no-sandbox', '--disable-dev-shm-usage'],
    })

    const port = Number(new URL(browser.wsEndpoint()).port)
    const flags: LighthouseFlags = {
      port,
      onlyCategories: ['seo', 'accessibility'],
      logLevel: 'error',
    }
    const config: LighthouseConfig = {
      extends: 'lighthouse:default',
    }

    const result = await lighthouse(served.url, flags, config)
    if (!result) {
      throw new Error('Lighthouse returned no result')
    }
    const { lhr } = result

    const report = {
      seo: buildCategory(lhr, 'seo'),
      accessibility: buildCategory(lhr, 'accessibility'),
    }

    if (process.env.ENVIRONMENT === 'development') {
      const reportsDir = path.join(process.cwd(), 'reports');
      fs.mkdirSync(reportsDir, { recursive: true });
      const reportPath = path.join(reportsDir, `report-${Date.now()}.json`);
      fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf8');
    }

    return report;
  } catch (err) {
    throw new Error(`Lighthouse audit failed: ${(err as Error).message}`, { cause: err })
  } finally {
    if (browser) {
      await browser.close().catch(() => {})
    }
    await served.cleanup()
  }
}

function buildCategory(lhr: any, category: 'seo' | 'accessibility'): { score: number; audits: LighthouseAuditEntry[] } {
  const categoryData = lhr?.categories?.[category]
  const score = categoryData ? Math.round((categoryData.score ?? 0) * 100) : 0
  const auditRefs: { id: string }[] = categoryData?.auditRefs ?? []

  const audits: LighthouseAuditEntry[] = []
  for (const ref of auditRefs) {
    const audit = lhr?.audits?.[ref.id]
    if (!audit) continue
    // Only include actually-failing audits (score === 0). Audits with score null
    // are "not applicable" (e.g. no images on the page), not failures, and
    // including them bloats the LLM prompt and slows generation.
    if (audit.score !== 0) continue
    audits.push({
      id: audit.id,
      title: audit.title,
      description: audit.description ?? '',
      score: audit.score,
      displayValue: audit.displayValue,
    })
  }

  return { score, audits }
}
