import winston from 'winston';
import path from 'path';

const { combine, timestamp, printf, colorize, errors } = winston.format;

// Custom log format
const logFormat = printf(({ level, message, timestamp, stack }) => {
  return `${timestamp} ${level}: ${stack || message}`;
});

// Development logger
const developmentLogger = winston.createLogger({
  level: 'debug',
  format: combine(
    colorize(),
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    errors({ stack: true }),
    logFormat
  ),
  transports: [
    new winston.transports.Console()
  ]
});

// Production logger
const productionLogger = winston.createLogger({
  level: 'info',
  format: combine(
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    errors({ stack: true }),
    logFormat
  ),
  transports: [
    new winston.transports.Console()
  ]
});

const isServerless = !!process.env.VERCEL || !!process.env.AWS_REGION || !!process.env.AWS_LAMBDA_FUNCTION_NAME;

// Export appropriate logger based on environment
const logger = isServerless
  ? winston.createLogger({
      level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
      format: combine(
        timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        errors({ stack: true }),
        logFormat
      ),
      transports: [new winston.transports.Console()]
    })
  : (process.env.NODE_ENV === 'production' ? productionLogger : developmentLogger);

export default logger;