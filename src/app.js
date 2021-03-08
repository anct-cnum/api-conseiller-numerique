const compress = require('compression');
const helmet = require('helmet');
const cors = require('cors');
const logger = require('./logger');

const feathers = require('@feathersjs/feathers');
const configuration = require('@feathersjs/configuration');
const express = require('@feathersjs/express');


const middleware = require('./middleware');
const services = require('./services');
const appHooks = require('./app.hooks');
const channels = require('./channels');

const authentication = require('./authentication');

const mongodb = require('./mongodb');

const app = express(feathers());


app.configure(configuration());

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
