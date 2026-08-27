import type { Response } from 'express'

export type ClientLogLevel = 'log' | 'info' | 'warn' | 'error'

// The active SSE response for the current audit request, if any.
let current: Response | null = null

/**
 * Initializes the SSE stream for the current audit request and makes it the
 * target of subsequent `clientLog` calls. Call this once at the start of the
 * /audit handler, before any logging.
 */
export function initStream(res: Response, onDisconnect?: () => void): void {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  })
  current = res
  res.on('close', () => {
    if (current === res) current = null
    onDisconnect?.()
  })
}

function sendEvent(event: string, data: unknown): void {
  current?.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
}

/**
 * Sends a text line to the connected client via the stream and mirrors it to
 * the server console for local debugging. Safe to call anywhere (no-ops when
 * no stream is active).
 */
export function clientLog(message: unknown, level: ClientLogLevel = 'log'): void {
  const text = typeof message === 'string' ? message : safeStringify(message)

  if (level === 'error') console.error(`${text}`)
  else if (level === 'warn') console.warn(`${text}`)
  else if (level === 'info') console.info(`${text}`)
  else console.log(`${text}`)

  sendEvent('log', { level, message: text })
}

/**
 * Streams raw content (e.g. assistant message deltas) to the client as a
 * `delta` event so the UI can append it in place, like a terminal.
 */
export function clientLogDelta(content: string, level: ClientLogLevel = 'log'): void {
  sendEvent('delta', { level, content })
}

/**
 * Sends the final validated report to the client and closes the stream.
 */
export function endStream(report: unknown): void {
  sendEvent('report', { report })
  current?.end()
  current = null
}

/**
 * Sends an error to the client and closes the stream.
 */
export function failStream(message: string): void {
  sendEvent('error', { message })
  current?.end()
  current = null
}

/**
 * Returns a throttled logger for token-level deltas (e.g. assistant.message_delta).
 * Deltas accumulate in a buffer and are flushed to the client every `intervalMs`
 * as `delta` events, so the UI can render a smooth terminal-like stream instead
 * of one event per token.
 */
export function createDeltaLogger(intervalMs = 50): { push: (delta: string, level?: ClientLogLevel) => void; flush: () => void } {
  let buffer = ''
  let timer: NodeJS.Timeout | null = null
  
  const flush = (level: ClientLogLevel = 'log') => {
    timer = null
    if (buffer) {
      clientLogDelta(buffer, level)
      buffer = ''
    }
  }

  return {
    push(delta: string, level: ClientLogLevel = 'log') {
      buffer += delta
      if (timer) return
      timer = setTimeout(() => flush(level), intervalMs)
    },
    flush(level: ClientLogLevel = 'log') {
      if (timer) clearTimeout(timer)
      flush(level)
    },
  }
}

function safeStringify(value: unknown): string {
  try {
    return JSON.stringify(value)
  } catch {
    return String(value)
  }
}
