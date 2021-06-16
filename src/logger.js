const { createLogger, format, transports } = require('winston');
const winston = require('winston');
require('winston-logstash');

let logger = null;

if (process.env.NODE_ENV !== 'production') {
  logger = createLogger({
    level: 'info',
    format: format.combine(
      format.colorize(),
      format.splat(),
      format.simple()
    ),
    transports: [
      new transports.Console()
    ],
  });
} else {
  logger = createLogger({
    level: 'info',
    format: format.combine(
      format.splat(),
      winston.format.logstash()
    ),
    transports: [
      new transports.Console()
    ],
  });
}

module.exports = logger;
