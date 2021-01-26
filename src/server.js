const express = require('express');
const Boom = require('@hapi/boom');

module.exports = components => {
  const app = express();
  const { logger, configuration } = components;

  app.disable('x-powered-by');
  app.use(express.json());

  //  try {
  //    if (configuration.documentation.enabled) {
  //      logger.info('Documentation available on /api/doc');
  //      app.use('/api', require('./routes/swagger.js')(components));
  //    }
  //  } catch (e) {
  //    // catch bad YAML format + missing configuration
  //    logger.error(e);
  //  }

  app.use('/api', require('./routes/api.js')(components));
  //  app.use('/ping', require('./routes/healthcheck.js')(components));

  app.use((rawError, req, res, next) => { // eslint-disable-line no-unused-vars
    let error = req.err = rawError;
    if (!rawError.isBoom) {
      error = Boom.boomify(rawError, {
        statusCode: rawError.status || 500,
        ...(!rawError.message ? 'Une erreur est survenue' : {}),
      });
    }
    if (error.output.statusCode > 404) {
      logger.error(rawError, { req: req });
    }
    return res.status(error.output.statusCode).send(Object.assign(error.output.payload, error.data));
  });

  return app;
};
