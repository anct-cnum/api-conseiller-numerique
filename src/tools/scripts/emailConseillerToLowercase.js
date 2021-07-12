#!/usr/bin/env node
'use strict';

require('dotenv').config();

const { execute } = require('../utils');

execute(__filename, async ({ db, logger, exit }) => {
  logger.info('Récupères les emails des conseillers en minuscule...');
  let count = 0;
  let promises = [];
  await db.collection('conseillers').find({}, { 'email': 1 }).forEach(function(doc) {
    promises.push(new Promise(async resolve => {
      await db.collection('conseillers').updateOne(
        { _id: doc._id },
        { $set: { 'email': doc.email.toLowerCase() } }
      );
      count++;
      resolve();
    }));
  });

  await db.collection('misesEnRelation').find({ conseillerObj: { $ne: null } }).forEach(function(doc) {
    promises.push(new Promise(async resolve => {
      await db.collection('misesEnRelation').updateOne(
        { _id: doc._id },
        { $set: { 'conseillerObj.email': doc.conseillerObj.email.toLowerCase() } }
      );
      count++;
      resolve();
    }));
  });

  await Promise.all(promises);
  logger.info(`${count} conseillers et mises en relation mis à jour`);
  exit();
});
