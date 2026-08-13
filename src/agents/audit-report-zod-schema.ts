import { z } from 'zod';

export const auditReportZodSchema = z.object({
  seo: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      status: z.enum(['pass', 'fail', 'warning']),
      description: z.string(),
      recommendation: z.string()
    })
  ),
  accessibility: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      status: z.enum(['pass', 'fail', 'warning']),
      description: z.string(),
      recommendation: z.string()
    })
  ),
  validation: z.array(
    z.object({
      rule: z.string(),
      status: z.enum(['pass', 'fail', 'warning']),
      description: z.string(),
      recommendation: z.string()
    })
  ),
  summary: z.string()
});

export type AuditReport = z.infer<typeof auditReportZodSchema>;
