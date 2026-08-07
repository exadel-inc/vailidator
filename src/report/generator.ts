import type { AuditItem, AuditReport, ValidationRuleResult } from '../llm/client.js'

interface Score {
  pass: number
  total: number
}

/**
 * Converts an AuditReport into a fully self-contained HTML string.
 * No external CSS or JS — everything is inlined.
 */
export function generateHtmlReport(report: AuditReport): string {
  const summary = escapeHtml(report.summary ?? '')
  const seoItems = renderItems(report.seo)
  const a11yItems = renderItems(report.accessibility)
  const validationItems = renderValidation(report.validation)
  const seoScore = computeScore(report.seo)
  const a11yScore = computeScore(report.accessibility)
  const validationScore = computeValidationScore(report.validation)

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>HTML Validation Report</title>
<style>
  * { box-sizing: border-box; }
  body {
    margin: 0;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
    background: #f1f5f9;
    color: #0f172a;
    line-height: 1.5;
  }
  .container { max-width: 960px; margin: 0 auto; padding: 32px 20px 64px; }
  .hero {
    background: linear-gradient(135deg, #1e293b, #0f172a);
    color: #f8fafc;
    border-radius: 16px;
    padding: 32px;
    margin-bottom: 24px;
  }
  .hero h1 { margin: 0 0 8px; font-size: 26px; }
  .hero .summary { margin: 0; color: #cbd5e1; font-size: 15px; }
  .scoreboard { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 32px; }
  .score-card {
    background: #fff;
    border: 1px solid #e2e8f0;
    border-radius: 12px;
    padding: 16px 20px;
    text-align: center;
  }
  .score-card .score-label {
    display: block;
    font-size: 13px;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: #64748b;
    margin-bottom: 6px;
  }
  .score-card .score-value { font-size: 28px; font-weight: 700; }
  .score-card .score-sub { display: block; font-size: 12px; color: #94a3b8; margin-top: 4px; }
  section { margin-bottom: 32px; }
  section h2 { font-size: 20px; margin: 0 0 16px; }
  .empty { color: #64748b; font-style: italic; }
  .item {
    background: #fff;
    border: 1px solid #e2e8f0;
    border-left-width: 4px;
    border-radius: 10px;
    padding: 16px 20px;
    margin-bottom: 12px;
  }
  .item.fail { border-left-color: #dc2626; }
  .item.warning { border-left-color: #d97706; }
  .item.pass { border-left-color: #16a34a; }
  .item-header { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; margin-bottom: 6px; }
  .item-header h3 { margin: 0; font-size: 15px; }
  .item-header code { font-size: 12px; color: #64748b; background: #f1f5f9; padding: 2px 6px; border-radius: 4px; }
  .item .description { margin: 0 0 8px; color: #334155; font-size: 14px; }
  .item .recommendation {
    margin: 0;
    font-size: 13px;
    color: #475569;
    background: #f8fafc;
    border-radius: 6px;
    padding: 8px 10px;
  }
  .badge {
    display: inline-block;
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    padding: 3px 8px;
    border-radius: 999px;
    color: #fff;
  }
  .badge.pass { background: #16a34a; }
  .badge.fail { background: #dc2626; }
  .badge.warning { background: #d97706; }
  @media (max-width: 640px) {
    .scoreboard { grid-template-columns: 1fr; }
  }
</style>
</head>
<body>
<main class="container">
  <header class="hero">
    <h1>HTML Validation Report</h1>
    <p class="summary">${summary}</p>
  </header>

  <section class="scoreboard">
    <div class="score-card">
      <span class="score-label">SEO</span>
      <span class="score-value" style="color: ${scoreColor(seoScore)}">${seoScore.pass}/${seoScore.total}</span>
      <span class="score-sub">passing checks</span>
    </div>
    <div class="score-card">
      <span class="score-label">Accessibility</span>
      <span class="score-value" style="color: ${scoreColor(a11yScore)}">${a11yScore.pass}/${a11yScore.total}</span>
      <span class="score-sub">passing checks</span>
    </div>
    <div class="score-card">
      <span class="score-label">Validation rules</span>
      <span class="score-value" style="color: ${scoreColor(validationScore)}">${validationScore.pass}/${validationScore.total}</span>
      <span class="score-sub">rules passed</span>
    </div>
  </section>

  <section>
    <h2>SEO</h2>
    ${seoItems}
  </section>

  <section>
    <h2>Accessibility</h2>
    ${a11yItems}
  </section>

  <section>
    <h2>Validation rules</h2>
    ${validationItems}
  </section>
</main>
</body>
</html>`
}

function renderItems(items: AuditItem[]): string {
  if (items.length === 0) {
    return '<p class="empty">No issues found. 🎉</p>'
  }
  return items
    .map((item) => {
      const recommendation = item.recommendation
        ? `<p class="recommendation"><strong>Recommendation:</strong> ${escapeHtml(item.recommendation)}</p>`
        : ''
      return `
<article class="item ${item.status}">
  <div class="item-header">
    <span class="badge ${item.status}">${statusLabel(item.status)}</span>
    <h3>${escapeHtml(item.title)}</h3>
    <code>${escapeHtml(item.id)}</code>
  </div>
  <p class="description">${escapeHtml(item.description)}</p>
  ${recommendation}
</article>`.trim()
    })
    .join('\n')
}

function renderValidation(results: ValidationRuleResult[]): string {
  if (results.length === 0) {
    return '<p class="empty">No validation rules were evaluated.</p>'
  }
  return results
    .map((result) => {
      const recommendation = result.recommendation
        ? `<p class="recommendation"><strong>Recommendation:</strong> ${escapeHtml(result.recommendation)}</p>`
        : ''
      return `
<article class="item ${result.status}">
  <div class="item-header">
    <span class="badge ${result.status}">${statusLabel(result.status)}</span>
    <h3>${escapeHtml(result.rule)}</h3>
  </div>
  <p class="description">${escapeHtml(result.description)}</p>
  ${recommendation}
</article>`.trim()
    })
    .join('\n')
}

function computeScore(items: AuditItem[]): Score {
  return {
    pass: items.filter((item) => item.status === 'pass').length,
    total: items.length,
  }
}

function computeValidationScore(items: ValidationRuleResult[]): Score {
  return {
    pass: items.filter((item) => item.status === 'pass').length,
    total: items.length,
  }
}

function scoreColor(score: Score): string {
  if (score.total === 0) return '#64748b'
  const ratio = score.pass / score.total
  if (ratio >= 0.8) return '#16a34a'
  if (ratio >= 0.5) return '#d97706'
  return '#dc2626'
}

function statusLabel(status: string): string {
  return status.charAt(0).toUpperCase() + status.slice(1)
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}
