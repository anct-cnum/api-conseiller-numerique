const moment = require('moment');

const feathers = require('@feathersjs/feathers');
const configuration = require('@feathersjs/configuration');
const config = configuration();
const express = require('@feathersjs/express');
const Sentry = require('@sentry/node');

const middleware = require('../middleware');
const services = require('../services');
const appHooks = require('../app.hooks');
const channels = require('../channels');

const authentication = require('../authentication');

const mongodb = require('../mongodb');

const createEmails = require('../emails/emails');
const createMailer = require('../mailer');

const f = feathers();
const app = express(f);

app.configure(config);
app.configure(mongodb);
app.configure(middleware);
app.configure(authentication);
app.configure(services);
app.configure(channels);
app.hooks(appHooks);

const logger = require('../logger');

let transaction = null;

module.exports = {
  delay: milliseconds => {
    return new Promise(resolve => setTimeout(() => resolve(), milliseconds));
  },
  capitalizeFirstLetter: string => string.charAt(0).toUpperCase() + string.slice(1),
  execute: async (name, job) => {
    if (config().sentry.enabled === 'true') {
      Sentry.init({
        dsn: config().sentry.dsn,
        environment: config().sentry.environment,

        // Set tracesSampleRate to 1.0 to capture 100%
        // of transactions for performance monitoring.
        // We recommend adjusting this value in production
        tracesSampleRate: parseFloat(config().sentry.traceSampleRate),
      });
      transaction = Sentry.startTransaction({
        op: 'Lancement de script',
        name: name,
      });
      app.use(Sentry.Handlers.errorHandler());
      process.on('unhandledRejection', e => Sentry.captureException(e));
      process.on('uncaughtException', e => Sentry.captureException(e));
    } else {
      process.on('unhandledRejection', e => logger.error(e));
      process.on('uncaughtException', e => logger.error(e));
    }

    const exit = async error => {
      if (error) {
        Sentry.captureException(error);
        logger.error(error);
        process.exitCode = 1;
      }
      if (transaction !== null) {
        transaction.finish();
      }
      setTimeout(() => {
        process.exit();
      }, 1000);
    };

    const db = await app.get('mongoClient');
    let mailer = createMailer(app);

    const emails = createEmails(db, mailer, app);
    let jobComponents = Object.assign({}, { feathers: f, db, logger, exit, emails, app, Sentry });

    try {
      let launchTime = new Date().getTime();
      await job(jobComponents);
      let duration = moment.utc(new Date().getTime() - launchTime).format('HH:mm:ss.SSS');
      console.log(`Completed in ${duration}`);
      exit();
    } catch (e) {
      exit(e);
    }
  },
};
