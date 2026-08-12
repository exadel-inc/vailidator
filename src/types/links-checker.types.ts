export type LinksCheckerReport = LinksCheckerReportItem[];

 export type LinksCheckerReportItem = {
  url: string
  status: 'valid' | 'invalid'
}
