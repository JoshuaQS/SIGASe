type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const ENABLE_DEBUG =
  import.meta.env.DEV || import.meta.env.VITE_DEBUG_LOGS === 'true';

function write(level: LogLevel, scope: string, message: string, meta?: unknown) {
  if (!ENABLE_DEBUG && level === 'debug') return;

  const prefix = `[${scope}] ${message}`;

  switch (level) {
    case 'debug':
      console.debug(prefix, meta ?? '');
      break;
    case 'info':
      console.info(prefix, meta ?? '');
      break;
    case 'warn':
      console.warn(prefix, meta ?? '');
      break;
    case 'error':
      console.error(prefix, meta ?? '');
      break;
  }
}

export const logger = {
  debug: (scope: string, message: string, meta?: unknown) =>
    write('debug', scope, message, meta),
  info: (scope: string, message: string, meta?: unknown) =>
    write('info', scope, message, meta),
  warn: (scope: string, message: string, meta?: unknown) =>
    write('warn', scope, message, meta),
  error: (scope: string, message: string, meta?: unknown) =>
    write('error', scope, message, meta),
};