#!/usr/bin/env node
'use strict';

const { program } = require('commander');
const { execute } = require('../utils');
const dropIndexes = require('./tasks/dropIndexes');
const createIndexes = require('./tasks/createIndexes');
const dropUnusedIndexes = require('./tasks/findUnusedIndexes');

program.description('Manage indexes')
.option('-f, --find', 'Find unused indexes')
.option('-d, --drop', 'Drop all indexes')
.helpOption('-e', 'HELP command')
.parse(process.argv);

execute(__filename, async ({ db, logger }) => {
  const options = program.opts();

  if (options.find) {
    logger.info('Dropping unused indexes...');
    await dropUnusedIndexes(db);
    logger.info('Ci-dessus, les index à supprimer dans le fichier mongoIndexes.js.');
    return true;
  }

  if (options.drop) {
    logger.info('Dropping indexes...');
    await dropIndexes(db);
  }

  logger.info('Creating indexes...');
  await createIndexes(db);
});
