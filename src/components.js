const configuration = require('config');
const createLogger = require('./components/logger');

module.exports = async () => {
  const logger = await createLogger(configuration);

  return {
    configuration,
    logger,
  };
};
