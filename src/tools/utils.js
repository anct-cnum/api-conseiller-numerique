const moment = require('moment');

const feathers = require('@feathersjs/feathers');
const configuration = require('@feathersjs/configuration');
const express = require('@feathersjs/express');

const middleware = require('../middleware');
const services = require('../services');
const appHooks = require('../app.hooks');
const channels = require('../channels');

const authentication = require('../authentication');

const mongodb = require('../mongodb');

const f = feathers();
const app = express(f);

app.configure(configuration());
app.configure(mongodb);
app.configure(middleware);
app.configure(authentication);
app.configure(services);
app.configure(channels);
app.hooks(appHooks);

const logger = require('../logger');

module.exports = {
  execute: async job => {

    process.on('unhandledRejection', e => console.log(e));
    process.on('uncaughtException', e => console.log(e));

    const exit = async error => {
      if (error) {
        logger.error(error);
        process.exitCode = 1;
      }
      process.exit();
    };

    const db = await app.get('mongoClient');
    let jobComponents = Object.assign({}, { feathers: f, db, logger, exit });

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
