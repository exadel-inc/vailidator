// Client-side pub/sub that connects the audit SSE stream reader (services/audit.ts)
// to UI components such as the terminal-style Logger panel.

export interface ServerLogEvent {
  kind: 'log' | 'delta';
  level: string;
  text: string;
}

type ServerLogListener = (event: ServerLogEvent) => void;

const listeners = new Set<ServerLogListener>();

// Subscribe to server log stream events. Returns an unsubscribe function.
export function onServerLog(listener: ServerLogListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

// Emit an event to all subscribers (called by the audit stream reader).
export function emitServerLog(event: ServerLogEvent): void {
  for (const listener of listeners) {
    listener(event);
  }
}
