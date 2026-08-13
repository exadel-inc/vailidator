import runAgent from './auditor-agent.js';
import runClaude from './auditor-claude.js';

export type Auditor = typeof runAgent;

const AUDITORS: Record<string, Auditor> = {
  native: runAgent,
  claude: runClaude,
};

export const AUDITOR_NAMES: readonly string[] = Object.keys(AUDITORS);

export const DEFAULT_AUDITOR = 'claude';

export function getAuditorName(): string {
  return process.env.AUDITOR ?? DEFAULT_AUDITOR;
}

export function getAuditor(): Auditor {
  const selected = getAuditorName().toLowerCase();
  const auditor = AUDITORS[selected];
  if (!auditor) {
    throw new Error(
      `Unknown AUDITOR "${selected}". Valid values: ${AUDITOR_NAMES.join(', ')}`
    );
  }
  return auditor;
}
