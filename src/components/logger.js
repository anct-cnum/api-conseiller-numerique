const winston = require('winston');
// moment could be used by production format template string
// eslint-disable-next-line no-unused-vars
//const moment = require('moment');

module.exports = async configuration => {
  const logger = winston.createLogger({
    level: configuration.logger.defaultLevel,
    defaultMeta: { service: configuration.app.name, env: configuration.env }
  });

  if (configuration.env !== 'production') {
    //
    // If we're not in production then log to the `console` with the format:
    // `${info.level}: ${info.message} JSON.stringify({ ...rest }) `
    //
    logger.add(new winston.transports.Console({
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.colorize(),
        winston.format.simple()
      )
    }));
  } else {
    //
    // If we're in production then log to the `console` with Log4j format
    //
    // eslint-disable-next-line no-unused-vars
    const productionFormat = winston.format.printf(({ level, message, service, env, timestamp }) => {
      // eslint-disable-next-line no-eval
      return eval(configuration.logger.productionFormat);
    });

    logger.add(new winston.transports.Console({
      format: winston.format.combine(
        winston.format.timestamp(),
        productionFormat
      ),
    }));
  }

  if (configuration.env === 'test') {
    logger.transports.forEach(t => {
      t.silent = true;
    });
  }

  return logger;
};
