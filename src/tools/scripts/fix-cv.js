#!/usr/bin/env node
'use strict';

const { execute } = require('../utils');

execute(__filename, async ({ logger, db }) => {
  const conseillers = await db.collection('conseillers').find({ cv: { $ne: null } }).toArray();
  let promises = [];

  logger.info('Attache le CV sur l\'ensemble des doublons de conseillers...');
  conseillers.forEach(conseiller => {
    promises.push(new Promise(async resolve => {
      await db.collection('conseillers').updateMany({ email: conseiller.email }, { $set: { cv: conseiller.cv } });

      await db.collection('misesEnRelation').updateMany({ 'conseillerObj.email': conseiller.email },
        { $set: {
          'conseillerObj.cv': conseiller.cv
        } });

      resolve();
    }));
  });
  await Promise.all(promises);
});
