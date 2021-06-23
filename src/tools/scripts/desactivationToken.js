#!/usr/bin/env node
'use strict';

require('dotenv').config();

const { execute } = require('../utils');
const dayjs = require('dayjs');
const { ObjectID } = require('mongodb');

execute(__filename, async ({ db, logger, exit, Sentry }) => {
  logger.info('Désactivation du token de mot de passe oublié 7 jours après sa création...');

  let promises = [];
  let count = 0;
  const dateDebut = dayjs(Date()).subtract(7, 'days').format('YYYY/MM/DD 00:00:00');
  const dateFin = dayjs(Date()).subtract(7, 'days').format('YYYY/MM/DD 23:59:59');

  await db.collection('users').find(
    { tokenCreateAt: { $gte: new Date(dateDebut), $lt: new Date(dateFin) } }
  ).forEach(function(user) {
    promises.push(new Promise(async resolve => {
      try {
        await db.collection('users').updateOne(
          { _id: new ObjectID(user._id) },
          { $set: { 'token': null, 'tokenCreateAt': null } }
        );
      } catch (error) {
        logger.error(error);
        Sentry.captureException(error);
      }
      count++;
      resolve();
    }));
  });
  await Promise.all(promises);

  logger.info(`${count} token ont été réinitialisés`);
  exit();
});
