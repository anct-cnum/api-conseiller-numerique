#!/usr/bin/env node
'use strict';

const { execute } = require('../../utils');
const { loginAPI, searchUser } = require('../../../utils/mattermost');

execute(__filename, async ({ app, db, logger, Sentry }) => {
  const mattermost = app.get('mattermost');
  const token = await loginAPI({ mattermost });

  const sleep = ms => new Promise(r => setTimeout(r, ms));
  let count = 0;
  const conseillers = await db.collection('conseillers').find({
    'statut': { $ne: 'RUPTURE' },
    'mattermost.error': { $eq: true }
  }).toArray();

  for (const conseiller of conseillers) {
    try {
      const result = await searchUser(mattermost, token, conseiller);
      if (result.data.length > 0) {
        const user = result.data[0];

        db.collection('conseillers').updateOne({ _id: conseiller._id }, {
          $set: {
            'mattermost.id': user.id,
            'mattermost.login': user.username,
            'mattermost.error': false
          }
        });
        count++;
      }
    } catch (e) {
      Sentry.captureException(e);
      logger.error(e);
    }

    // To avoid overload Mattermost API
    await sleep(500);
  }

  logger.info(`[MATTERMOST] ${count} conseillers corrigés`);
});
