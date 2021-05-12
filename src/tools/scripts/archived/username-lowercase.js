#!/usr/bin/env node
'use strict';

require('dotenv').config();

const { execute } = require('../../utils');

execute(__filename, async ({ db, logger, exit }) => {
  logger.info('Passes les noms d\'utilisateur en minuscule...');
  let count = 0;
  let promises = [];
  await db.collection('users').find({}, { 'name': 1 }).forEach(function(doc) {
    promises.push(new Promise(async resolve => {
      await db.collection('users').updateOne(
        { _id: doc._id },
        { $set: { 'name': doc.name.toLowerCase() } }
      );
      count++;
      resolve();
    }));
  });
  await Promise.all(promises);
  logger.info(`${count} utilisateurs mis à jour`);
  exit();
});
