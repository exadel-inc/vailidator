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
