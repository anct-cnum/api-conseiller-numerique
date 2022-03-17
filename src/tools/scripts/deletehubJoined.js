#!/usr/bin/env node
'use strict';

const { execute } = require('../utils');

execute(__filename, async ({ logger, db }) => {
  const countConseillerBefore = await db.collection('conseillers').countDocuments({ 'mattermost.hubJoined': true });
  logger.info(`${countConseillerBefore} conseiller qui a hubJoined à true dans mongo (avant updateMany)`);

  await db.collection('conseillers').updateMany({ 'mattermost.hubJoined': true }, { $unset: { 'mattermost.hubJoined': true } });
  logger.info('suppression de tout les clé mattermost..hubJoined: true ');

  const countConseillerAfter = await db.collection('conseillers').countDocuments({ 'mattermost.hubJoined': true });
  logger.info(`${countConseillerAfter} conseiller qui a hubJoined à true dans mongo (Après updateMany)`);

});
