#!/usr/bin/env node
'use strict';

require('dotenv').config();

const { execute } = require('../utils');

execute(__filename, async ({ db, logger, exit }) => {
  logger.info('Ajoute la date d\'envoi du mail de sondage...');
  let count = 0;
  let promises = [];
  await db.collection('sondages').find({}).forEach(function(doc) {
    promises.push(new Promise(async resolve => {
      await db.collection('conseillers').updateOne(
        { _id: doc.conseiller.oid },
        { $set: { 'sondageSentAt': doc.createdAt } } // On l'a pas mais ont prend la date du sondage à défaut
      );
      count++;
      resolve();
    }));
  });
  await Promise.all(promises);
  logger.info(`${count} conseillers mis à jour`);
  exit();
});
