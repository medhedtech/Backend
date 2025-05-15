import fs from 'fs';
import os from 'os';
import path from 'path';
import util from 'util';

import chalk from 'chalk';
import winston, { format, transports, createLogger } from 'winston';
import 'winston-daily-rotate-file';
import Transport from 'winston-transport';

// Dynamically load Sentry if available
let Sentry: any;
try {
  Sentry = require('@sentry/node');
} catch {
  Sentry = null;
}

// Ensure logs directory exists
const logsDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir);
}

// Custom log levels and colors
const customLevels = {
  levels: {
    fatal: 0,
    error: 1,
    warn: 2,
    info: 3,
    http: 4,
    verbose: 5,
    debug: 6,
    trace: 7,
  },
  colors: {
    fatal: 'bgRed white bold',
    error: 'red bold',
    warn: 'yellow bold',
    info: 'green',
    http: 'magenta',
    verbose: 'cyan',
    debug: 'blue',
    trace: 'gray',
  },
};

winston.addColors(customLevels.colors);

// Pretty console formatter
const prettyPrint = format((info) => {
  const icons: Record<string, string> = {
    fatal: '💀 ',
    error: '❌ ',
    warn: '⚠️ ',
    info: '📌 ',
    http: '🌐 ',
    verbose: '🔊 ',
    debug: '🐞 ',
    trace: '🔍 ',
  };
  info.levelIcon = icons[info.level] || '';
  const requestId = (info.metadata as any)?.requestId || '';
  info.formattedMessage = requestId ? `[${requestId}] ${info.message}` : info.message;
  info.component = (info.metadata as any)?.component || (info.metadata as any)?.category || 'system';
  return info;
});

// Structured JSON format for files
const structuredLogFormat = format.combine(
  format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
  format.errors({ stack: true }),
  format.metadata({ fillExcept: ['message', 'level', 'timestamp', 'label'] }),
  format.json(),
);

// Console format
const consoleLogFormat = format.combine(
  format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
  format.errors({ stack: true }),
  format.metadata({ fillExcept: ['message', 'level', 'timestamp', 'label'] }),
  prettyPrint(),
  format.colorize({ all: true }),
  format.printf((info: any) => {
    const { level, timestamp, levelIcon, formattedMessage, component } = info;
    return `${chalk.gray(`[${timestamp}]`)} ${levelIcon}${level.padEnd(7)} [${String(component).toUpperCase()}] ${formattedMessage}`;
  }),
);

// Create logger instance
const logger: any = createLogger({
  levels: customLevels.levels,
  level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
  defaultMeta: {
    service: 'course-service',
    environment: process.env.NODE_ENV || 'development',
    version: process.env.npm_package_version || 'unknown',
    hostname: os.hostname(),
  },
  transports: [
    new transports.File({ filename: path.join(logsDir, 'combined.log'), format: structuredLogFormat, maxsize: 10000000, maxFiles: 5 }),
    new transports.File({ filename: path.join(logsDir, 'error.log'), level: 'error', format: structuredLogFormat, maxsize: 10000000, maxFiles: 5 }),
    new transports.DailyRotateFile({ filename: path.join(logsDir, 'combined-%DATE%.log'), datePattern: 'YYYY-MM-DD', format: structuredLogFormat, maxSize: '20m', maxFiles: '14d' }),
    new transports.DailyRotateFile({ filename: path.join(logsDir, 'error-%DATE%.log'), datePattern: 'YYYY-MM-DD', level: 'error', format: structuredLogFormat, maxSize: '20m', maxFiles: '30d' }),
  ],
  exceptionHandlers: [new transports.File({ filename: path.join(logsDir, 'exceptions.log'), format: structuredLogFormat })],
  rejectionHandlers: [new transports.File({ filename: path.join(logsDir, 'rejections.log'), format: structuredLogFormat })],
});

// Console transport
if (process.env.NODE_ENV !== 'production') {
  logger.add(new transports.Console({ format: consoleLogFormat, handleExceptions: true, handleRejections: true }));
} else {
  logger.add(new transports.Console({ level: 'warn', format: consoleLogFormat, handleExceptions: true, handleRejections: true }));
  if (Sentry) {
    try {
      Sentry.init({ dsn: process.env.SENTRY_DSN, environment: process.env.NODE_ENV, release: process.env.npm_package_version, tracesSampleRate: 0.2 });
      class SentryTransport extends Transport {
        log(info: any, callback: () => void) {
          setImmediate(() => this.emit('logged', info));
          const { level, message, metadata } = info;
          if (level === 'error' || level === 'fatal') {
            if (metadata.error instanceof Error) Sentry.captureException(metadata.error, { extra: metadata });
            else Sentry.captureMessage(message, { extra: metadata });
          } else if (level === 'warn') {
            Sentry.captureMessage(message, { level: Sentry.Severity.Warning, extra: metadata });
          }
          callback();
        }
      }
      logger.add(new SentryTransport({ level: 'warn' }));
      logger.info('Sentry error tracking enabled');
    } catch (err) {
      logger.error('Failed to initialize Sentry', { error: err });
    }
  }
}

// Helper methods
logger.addRequestContext = (req: any) => ({ requestId: req.requestId || req.headers['x-request-id'], userId: req.user?._id, ip: req.ip, method: req.method, url: req.originalUrl });
logger.fatal = (msg: string, meta = {}) => { logger.log('fatal', msg, meta); if (Sentry) Sentry.captureMessage(msg, { level: Sentry.Severity.Fatal, extra: meta }); };
// Additional component loggers
['api', 'db', 'auth', 'email', 'redis', 'connection'].forEach((cat) => { logger[cat] = { info: (m: string, meta={}) => logger.log('info', m, { ...meta, component: cat.toUpperCase() }), warn: (m: string, meta={}) => logger.log('warn', m, { ...meta, component: cat.toUpperCase() }), error: (m: string, meta={}) => logger.log('error', m, { ...meta, component: cat.toUpperCase() }) }; });

export default logger; 