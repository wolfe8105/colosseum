// ============================================================
// THE COLOSSEUM — BOT LOGGER
// Daily rotating log files + console output.
// Logs go to ./logs/ directory.
// Updated Session 20: added leg3 convenience method.
// ============================================================
const winston = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');
const path = require('path');
const { config } = require('../bot-config');

const logDir = path.join(__dirname, '..', 'logs');

const logger = winston.createLogger({
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
logger.leg1 = (platform, action, details = {}) => {
  logger.info(`[LEG1][${platform.toUpperCase()}] ${action}`, details);
};

logger.leg2 = (source, action, details = {}) => {
  logger.info(`[LEG2][${source.toUpperCase()}] ${action}`, details);
};

logger.leg3 = (source, action, details = {}) => {
  logger.info(`[LEG3][${source.toUpperCase()}] ${action}`, details);
};

logger.metric = (name, value, details = {}) => {
  logger.info(`[METRIC] ${name}=${value}`, details);
};

module.exports = logger;
