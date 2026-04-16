// ============================================================
// THE COLOSSEUM — BOT LOGGER (TypeScript)
// Daily rotating log files + console output.
// Logs go to ./logs/ directory.
// Migrated to TypeScript: Session 131.
// ============================================================
import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import path from 'path';
import { config } from '../bot-config';

const logDir = path.join(__dirname, '..', 'logs');

export interface BotLogger extends winston.Logger {
  leg1: (platform: string, action: string, details?: Record<string, unknown>) => void;
  leg2: (source: string, action: string, details?: Record<string, unknown>) => void;
  leg3: (source: string, action: string, details?: Record<string, unknown>) => void;
  metric: (name: string, value: string | number, details?: Record<string, unknown>) => void;
}

const baseLogger = winston.createLogger({
  level: config.logLevel,
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.printf(({ timestamp, level, message, ...meta }) => {
      const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
      return `[${timestamp}] ${level.toUpperCase().padEnd(5)} ${message}${metaStr}`;
    })
  ),
  transports: [
    // Console — always on
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.timestamp({ format: 'HH:mm:ss' }),
        winston.format.printf(({ timestamp, level, message }) => {
          return `${timestamp} ${level} ${message}`;
        })
      ),
    }),
    // Daily file — all logs
    new DailyRotateFile({
      dirname: logDir,
      filename: 'bot-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      maxSize: '10m',
      maxFiles: '30d',
    }),
    // Separate error file
    new DailyRotateFile({
      dirname: logDir,
      filename: 'errors-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      level: 'error',
      maxSize: '10m',
      maxFiles: '60d',
    }),
  ],
});

// Convenience methods with structured data
const logger = baseLogger as BotLogger;

logger.leg1 = (platform: string, action: string, details: Record<string, unknown> = {}): void => {
  logger.info(`[LEG1][${platform.toUpperCase()}] ${action}`, details);
};

logger.leg2 = (source: string, action: string, details: Record<string, unknown> = {}): void => {
  logger.info(`[LEG2][${source.toUpperCase()}] ${action}`, details);
};

logger.leg3 = (source: string, action: string, details: Record<string, unknown> = {}): void => {
  logger.info(`[LEG3][${source.toUpperCase()}] ${action}`, details);
};

logger.metric = (name: string, value: string | number, details: Record<string, unknown> = {}): void => {
  logger.info(`[METRIC] ${name}=${value}`, details);
};

export default logger;
