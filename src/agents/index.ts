import runVercel from './vercel/auditor-vercel.js';
import runClaude from './claude/auditor-claude.js';
import runCopilot from './copilot/auditor-copilot.js';
import { AuditReport } from './audit-report-zod-schema.js';

export type Auditor = (prompt: string) => Promise<AuditReport>;

const AUDITORS: Record<string, Auditor> = {
  vercel: runVercel,
  claude: runClaude,
  copilot: runCopilot,
};

export const AUDITOR_NAMES: readonly string[] = Object.keys(AUDITORS);

export const DEFAULT_AUDITOR = 'claude';

export function getAuditorName(): string {
  return process.env.AUDITOR ?? DEFAULT_AUDITOR;
}

export function getAuditor(): Auditor {
  const selected = getAuditorName().toLowerCase();
  console.log(`[audit] Selected auditor: ${selected}`);
  const auditor = AUDITORS[selected];
  if (!auditor) {
    throw new Error(
      `Unknown AUDITOR "${selected}". Valid values: ${AUDITOR_NAMES.join(', ')}`
    );
  }
  return auditor;
}
