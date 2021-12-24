#!/usr/bin/env node
'use strict';

const { execute } = require('../../utils');
const { loginAPI, joinFixTeam } = require('../../../utils/mattermost');

execute(__filename, async ({ app, db, logger, Sentry }) => {
  const mattermost = app.get('mattermost');
  const token = await loginAPI({ mattermost });

  const sleep = ms => new Promise(r => setTimeout(r, ms));
  let count = 0;
  const conseillers = await db.collection('conseillers').find({
    'mattermost.error': true,
    'mattermost.errorMessage': ''
  }).toArray();

  for (const conseiller of conseillers) {
    try {
      const result = await joinFixTeam(db, logger, Sentry, mattermost, token)(conseiller);
      if (result) {
        db.collection('conseillers').updateOne({ _id: conseiller._id }, {
          $set: {
            'mattermost.error': false
          },
          $unset: {
            'mattermost.errorMessage': ''
          }
        });
        count++;
        logger.info(`Conseiller id=${conseiller._id} avec un id mattermost: ${conseiller.mattermost.id} est corrigé par le script fixErrorMattermostIdHubs.js`);
      }
    } catch (e) {
      Sentry.captureException(e);
      logger.error(e);
    }
    // To avoid overload Mattermost API
    await sleep(500);
  }
  logger.info('Suppression des mattermost.errorMessage pour les mattermost.error qui sont à false');
  // eslint-disable-next-line max-len
  await db.collection('conseillers').updateMany({ 'mattermost.error': false, 'mattermost.errorMessage': { $exists: true} }, { $unset: { 'mattermost.errorMessage': '' } });

  logger.info(`[MATTERMOST] ${count} conseillers corrigés`);
});
