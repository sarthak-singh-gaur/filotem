/**
 * Production-ready structured logger for Filotem Backend.
 */
const LOG_LEVELS = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3
};

const currentLevel = process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug');

function formatMessage(level, message, meta) {
  const timestamp = new Date().toISOString();
  const metaStr = meta ? (meta instanceof Error ? meta.stack : ` ${JSON.stringify(meta)}`) : '';
  
  if (process.env.NODE_ENV === 'production') {
    return JSON.stringify({
      timestamp,
      level,
      message,
      ...(meta && !(meta instanceof Error) ? meta : {}),
      ...(meta instanceof Error ? { stack: meta.stack } : {})
    });
  }

  const icons = {
    debug: '🔍 [DEBUG]',
    info:  'ℹ️ [INFO] ',
    warn:  '⚠️ [WARN] ',
    error: '❌ [ERROR]'
  };

  return `${timestamp} ${icons[level] || level.toUpperCase()} ${message}${metaStr}`;
}

const logger = {
  debug(message, meta) {
    if (LOG_LEVELS[currentLevel] <= LOG_LEVELS.debug) {
      console.debug(formatMessage('debug', message, meta));
    }
  },
  info(message, meta) {
    if (LOG_LEVELS[currentLevel] <= LOG_LEVELS.info) {
      console.log(formatMessage('info', message, meta));
    }
  },
  warn(message, meta) {
    if (LOG_LEVELS[currentLevel] <= LOG_LEVELS.warn) {
      console.warn(formatMessage('warn', message, meta));
    }
  },
  error(message, meta) {
    if (LOG_LEVELS[currentLevel] <= LOG_LEVELS.error) {
      console.error(formatMessage('error', message, meta));
    }
  }
};

module.exports = logger;

