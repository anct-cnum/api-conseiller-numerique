#!/usr/bin/env node
'use strict';

const cli = require('commander');
const { execute } = require('../utils');
const dropIndexes = require('./tasks/dropIndexes');
const createIndexes = require('./tasks/createIndexes');
const findUnusedIndexes = require('./tasks/findUnusedIndexes');

cli.description('Manage indexes')
.option('-f, --find', 'Find unused indexes')
.option('-d, --drop', 'Drop all indexes')
.helpOption('-e', 'HELP command')
.parse(process.argv);

execute(__filename, async ({ db, logger }) => {

  if (cli.find) {
    return await findUnusedIndexes(db);
  }

  if (cli.drop) {
    logger.info('Dropping indexes...');
    await dropIndexes(db);
  }

  logger.info('Creating indexes...');
  return createIndexes(db);
});
