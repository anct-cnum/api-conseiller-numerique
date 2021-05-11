const compress = require('compression');
const helmet = require('helmet');
const cors = require('cors');
const logger = require('./logger');
const Sentry = require('@sentry/node');

const feathers = require('@feathersjs/feathers');
const configuration = require('@feathersjs/configuration');
const config = configuration();
const express = require('@feathersjs/express');

const middleware = require('./middleware');
const services = require('./services');
const appHooks = require('./app.hooks');
const channels = require('./channels');

const authentication = require('./authentication');

const mongodb = require('./mongodb');

if (config().sentry.enabled === 'true') {
  Sentry.init({
    dsn: config().sentry.dsn,
    environment: config().sentry.environment,

    // Set tracesSampleRate to 1.0 to capture 100%
    // of transactions for performance monitoring.
    // We recommend adjusting this value in production
    tracesSampleRate: parseFloat(config().sentry.traceSampleRate),
  });
}

const app = express(feathers());

app.configure(config);

if (config().sentry.enabled === 'true') {
  app.use(Sentry.Handlers.requestHandler());
  app.use(Sentry.Handlers.errorHandler());
}

app.set('sentry', Sentry);

app.use(helmet({
  contentSecurityPolicy: false
}));

const corsOptions = {
  origin: app.get('cors').whitelist,
  optionsSuccessStatus: 200 // some legacy browsers (IE11, various SmartTVs) choke on 204
};

app.use(cors(corsOptions));
app.use(compress());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.configure(express.rest());

app.configure(mongodb);

app.configure(middleware);
app.configure(authentication);
app.configure(services);
app.configure(channels);

app.use(express.notFound());
app.use(express.errorHandler({ logger }));

app.hooks(appHooks);

module.exports = app;
