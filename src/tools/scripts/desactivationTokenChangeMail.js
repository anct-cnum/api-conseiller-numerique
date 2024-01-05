#!/usr/bin/env node
'use strict';

require('dotenv').config();

const { execute } = require('../utils');
const dayjs = require('dayjs');

execute(__filename, async ({ db, logger, exit, Sentry }) => {
  logger.info('Rénitialisation du token mail à confirmer 28 jours après sa création...');

  let promises = [];
  let count = 0;
  const date = dayjs(Date()).subtract(28, 'days').format('YYYY/MM/DD 23:59:59');
  const queryDate = new Date(date);

  await db.collection('conseillers').find(
    {
      $or: [
        { tokenChangementMailCreatedAt: { $lt: queryDate } },
        { tokenChangementMailProCreatedAt: { $lt: queryDate } }
      ] }
  ).forEach(function(cn) {
    promises.push(new Promise(async resolve => {
      try {
        let listUnset = {};
        if (cn.tokenChangementMailCreatedAt < queryDate) {
          listUnset = {
            ...listUnset,
            mailAModifier: '',
            tokenChangementMail: '',
            tokenChangementMailCreatedAt: ''
          };
        }
        if (cn.tokenChangementMailProCreatedAt < queryDate) {
          listUnset = {
            ...listUnset,
            mailProAModifier: '',
            tokenChangementMailPro: '',
            tokenChangementMailProCreatedAt: '',
          };
        }
        await db.collection('conseillers').updateOne(
          { _id: cn._id },
          { $unset: listUnset }
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

  logger.info(`${count} token ont été réinitialisés pour la confirmation du changement mail.`);
  exit();
});
