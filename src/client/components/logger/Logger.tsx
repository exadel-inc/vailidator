import { useEffect, useRef, useState } from 'preact/hooks';
import { onServerLog, ServerLogEvent } from '../../services/logs';

interface LogLine {
  level: string;
  text: string;
  // Whether the line is still being appended to by streaming `delta` events.
  open: boolean;
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
    return [...lines, { level: event.level, text: event.text, open: false }];
  }

  // delta: streamed LLM content. Consecutive deltas append to the current open
  // line, but content must never glue onto a discrete log line, so after a
  // `log` event it starts on a fresh line. Each newline ends the current line;
  // empty parts (blank lines) are dropped so no empty lines are produced.
  if (!event.text) return lines;

  const level = event.level || 'log';
  const next = [...lines];
  let cur = next.length - 1;

  const ensureOpen = () => {
    if (cur < 0 || !next[cur].open) {
      next.push({ level, text: '', open: true });
      cur = next.length - 1;
    }
  };

  const parts = event.text.split('\n');
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    if (i < parts.length - 1) {
      // A newline follows this part: write it to the open line, then close it.
      if (part.length > 0) {
        ensureOpen();
        next[cur] = { ...next[cur], text: next[cur].text + part };
      }
      if (cur >= 0) next[cur] = { ...next[cur], open: false };
    } else if (part.length > 0) {
      // No trailing newline: keep writing to the open line (the next delta
      // event may continue it).
      ensureOpen();
      next[cur] = { ...next[cur], text: next[cur].text + part };
    }
  }

  return next;
}
