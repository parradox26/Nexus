type LogLevel = 'info' | 'warn' | 'error' | 'debug'

function log(level: LogLevel, message: string, meta?: unknown): void {
  const timestamp = new Date().toISOString()
  const entry: Record<string, unknown> = { timestamp, level, message }
  if (meta !== undefined) entry.meta = meta
  const output = JSON.stringify(entry)
  if (level === 'error') {
    console.error(output)
  } else {
    console.log(output)
  }
}

export const logger = {
  info: (message: string, meta?: unknown) => log('info', message, meta),
  warn: (message: string, meta?: unknown) => log('warn', message, meta),
  error: (message: string, meta?: unknown) => log('error', message, meta),
  debug: (message: string, meta?: unknown) => log('debug', message, meta),
}
