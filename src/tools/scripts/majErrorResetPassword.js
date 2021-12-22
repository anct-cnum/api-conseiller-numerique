#!/usr/bin/env node
'use strict';

const { execute } = require('../utils');

execute(__filename, async ({ logger, db }) => {
  const conseillers = await db.collection('conseillers').find({ 'mattermost.errorResetPassword': true }).toArray();
  let promises = [];
  let count = 0;

  logger.info('Mettre tous les mattermost.errorResetPassword à false...');
  conseillers.forEach(conseiller => {
    promises.push(new Promise(async resolve => {
      await db.collection('conseillers').updateOne({ _id: conseiller._id }, { $set: { 'mattermost.errorResetPassword': false } });
      logger.info(`Le conseiller avec l'idPG: ${conseiller.idPG} a eu un 'mattermost.errorResetPassword' à true`);
      count++;
      resolve();
    }));
  });
  await Promise.all(promises);
  logger.info(`${count} conseiller(s) remis à false pour 'mattermost.errorResetPassword'`);
});
