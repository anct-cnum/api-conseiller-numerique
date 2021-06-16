#!/usr/bin/env node
'use strict';

require('dotenv').config();

const { execute } = require('../utils');

execute(__filename, async ({ db, logger, exit }) => {
  logger.info('Met à jour le statut userCreated pour les structures qui le nécessite...');
  let count = 0;
  let promises = [];
  await db.collection('users').find({ roles: { $elemMatch: { $eq: 'structure' } } }).forEach(async user => {
    promises.push(new Promise(async resolve => {
      const found = await db.collection('structures').countDocuments({ _id: user.entity.oid, userCreated: true });
      if (found === 0) {
        count++;
        await db.collection('structures').updateOne(
          { _id: user.entity.oid },
          { $set: { userCreated: true } }
        );
      }
      resolve();
    }));
  });
  await Promise.all(promises);
  logger.info(`${count} structures mis à jour`);
  exit();
});
