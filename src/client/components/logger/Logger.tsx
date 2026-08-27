import { useEffect, useRef, useState } from 'preact/hooks';
import { onServerLog, ServerLogEvent } from '../../services/logs';

interface LogLine {
  level: string;
  text: string;
}

// Terminal-style panel that renders the server log stream in real time:
// discrete `log` events become lines, `delta` events append to the current line.
export function Logger({ isVisible }: { isVisible: boolean }) {
  const [lines, setLines] = useState<LogLine[]>([]);
  const bodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unsubscribe = onServerLog((event) => {
      setLines((prev) => appendEvent(prev, event));
    });
    return unsubscribe;
  }, []);

  // Auto-scroll to the newest line as content streams in.
  useEffect(() => {
    const el = bodyRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [lines]);

  return (
    <div class="va-logger" style={{ display: isVisible ? 'block' : 'none' }}>
      <div class="va-logger-header">Audit Log</div>
      <div class="va-logger-body" ref={bodyRef}>
        {lines.map((line, i) => (
          <div key={i} class={`va-logger-line va-logger-line--${line.level}`}>
            {line.text}
          </div>
        ))}
      </div>
    </div>
  );
}

function appendEvent(lines: LogLine[], event: ServerLogEvent): LogLine[] {
  if (event.kind === 'log') {
    return [...lines, { level: event.level, text: event.text }];
  }

  // delta: append to the current line, splitting embedded newlines.
  const [first, ...rest] = event.text.split('\n');
  const next = lines.length === 0 ? [{ level: event.level || 'log', text: first }] : [...lines];
  if (lines.length > 0) {
    const last = next[next.length - 1];
    next[next.length - 1] = { ...last, text: last.text + first };
  }
  for (const part of rest) {
    next.push({ level: event.level || 'log', text: part });
  }
  return next;
}
