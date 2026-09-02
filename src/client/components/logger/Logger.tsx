import { useEffect, useRef, useState } from 'preact/hooks';
import { onServerLog, ServerLogEvent } from '../../services/logs';

interface LogLine {
  level: string;
  text: string;
}

// Terminal-style panel that renders the server log stream in real time:
// discrete `log` events become lines, `delta` events append to the current line.
export function Logger({ isVisible, busy }: { isVisible: boolean; busy: boolean }) {
  const [lines, setLines] = useState<LogLine[]>([]);
  const [llmActive, setLlmActive] = useState(false);
  const bodyRef = useRef<HTMLDivElement>(null);
  const llmTimerRef = useRef<number | null>(null);

  useEffect(() => {
    const unsubscribe = onServerLog((event) => {
      if (event.kind === 'delta') {
        // Token content is streaming in, so the LLM is actively generating.
        setLlmActive(true);
        if (llmTimerRef.current !== null) window.clearTimeout(llmTimerRef.current);
        llmTimerRef.current = window.setTimeout(() => setLlmActive(false), 700);
      }
      setLines((prev) => appendEvent(prev, event));
    });
    return () => {
      if (llmTimerRef.current !== null) window.clearTimeout(llmTimerRef.current);
      unsubscribe();
    };
  }, []);

  // Auto-scroll to the newest line as content streams in.
  useEffect(() => {
    const el = bodyRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [lines]);

  return (
    <div class="va-logger" style={{ display: isVisible ? 'block' : 'none' }}>
      <div class="va-logger-header">
        <span>Audit Log</span>
        <span class="va-logger-status">
          {llmActive ? (
            <>
              <span class="va-logger-dots">
                <i />
                <i />
                <i />
              </span>
              <span>LLM is working</span>
            </>
          ) : busy ? (
            <>
              <span class="va-spinner" />
              <span>Audit in progress</span>
            </>
          ) : null}
        </span>
      </div>
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
