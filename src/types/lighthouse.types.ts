export interface LighthouseAuditEntry {
  id: string
  title: string
  description: string
  score: number | null
  displayValue?: string
}

export interface LighthouseResult {
  seo: {
    score: number
    audits: LighthouseAuditEntry[]
  }
  accessibility: {
    score: number
    audits: LighthouseAuditEntry[]
  }
}
