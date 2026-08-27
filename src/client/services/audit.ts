import type { AuditReport } from '../../types/audit-reports.types.js';
import { emitServerLog } from './logs';

const AUDIT_PORT = 3011;
const AUDIT_URL = `http://localhost:${AUDIT_PORT}/audit`;


export function getIframe(): HTMLIFrameElement | null {
  const iframe: HTMLIFrameElement | null =
    document.querySelector('iframe#ContentFrame') ||      // AEM Classic
    document.querySelector('iframe.cq-Overlay-element') || // AEM Touch UI
    document.querySelector('iframe[name="CQ"]');
  return iframe;
}

export function getIframeUrl(): string | null {
  const iframe = getIframe();
  if (!iframe) {
    alert('AEM preview iframe not found. Check selector.');
    return null;
  } 

  try {
    return iframe.contentWindow?.location.href ?? null;
  } catch {
    alert('Cannot access iframe content. Possible cross-origin restriction.');
    return null;
  }
}

// Grab the rendered HTML markup from the AEM preview iframe.
export function getMarkup(): string | null {
  const iframe = getIframe();

  if (!iframe) {
    alert('AEM preview iframe not found. Check selector.');
    return null;
  }

  try {
    return iframe.contentDocument?.documentElement.outerHTML ?? null;
  } catch {
    alert('Cannot access iframe content. Possible cross-origin restriction.');
    return null;
  }
}

// The audit endpoint responds as an SSE stream: server logs arrive as `log`
// events, streamed content as `delta`, and the validated report JSON arrives as
// the final `report` event.
export async function runAudit(markup: string, rules: string[], pageUrl: string): Promise<AuditReport> {
  const response = await fetch(AUDIT_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ markup, rules, pageUrl }),
  });

  if (!response.ok) {
    throw new Error(`Server error: ${response.status}`);
  }
  if (!response.body) {
    throw new Error('Server did not return a readable stream.');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let report: AuditReport | null = null;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    // SSE frames are separated by a blank line.
    const frames = buffer.split('\n\n');
    buffer = frames.pop() ?? '';

    for (const frame of frames) {
      const sse = parseSseFrame(frame);
      if (!sse) continue;

      if (sse.event === 'log') {
        emitServerLog({ kind: 'log', level: sse.data.level ?? 'log', text: sse.data.message ?? '' });
      } else if (sse.event === 'delta') {
        // Streamed content goes to the UI panel only (not the console).
        emitServerLog({ kind: 'delta', level: 'log', text: sse.data.content ?? '' });
      } else if (sse.event === 'report') {
        report = sse.data.report;
      } else if (sse.event === 'error') {
        throw new Error(sse.data.message ?? 'Audit failed');
      }
    }
  }

  if (report === null) {
    throw new Error('Server closed the stream without a report.');
  }
  return report;
}

interface SseFrame {
  event: string;
  data: any;
}

// Parse a single SSE frame ("event: X\ndata: {...}") into its event name and data.
function parseSseFrame(raw: string): SseFrame | null {
  let event = 'message';
  let data = '';
  for (const line of raw.split('\n')) {
    if (line.startsWith('event:')) event = line.slice(6).trim();
    else if (line.startsWith('data:')) data += line.slice(5).trim();
  }
  if (!data) return null;
  try {
    return { event, data: JSON.parse(data) };
  } catch {
    return null;
  }
}

// Write a server log entry to this browser's console.
function logServerEvent(entry: { level?: string; message?: string }): void {
  const prefix = `[server ${new Date().toLocaleTimeString()}]`;
  const message = entry.message ?? '';
  if (entry.level === 'error') console.error(prefix, message);
  else if (entry.level === 'warn') console.warn(prefix, message);
  else if (entry.level === 'info') console.info(prefix, message);
  else console.log(prefix, message);
}

