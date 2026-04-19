const winston = require('winston');

const levels = { error: 0, warn: 1, info: 2, http: 3, debug: 4 };
const colors = { error: 'red', warn: 'yellow', info: 'green', http: 'magenta', debug: 'white' };
winston.addColors(colors);

const format = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.colorize({ all: true }),
  winston.format.printf(({ timestamp, level, message }) => `${timestamp} ${level}: ${message}`)
);

const logger = winston.createLogger({
  level: 'debug',
  levels,
  format,
  transports: [
    new winston.transports.Console(),
  ],
});

module.exports = logger;