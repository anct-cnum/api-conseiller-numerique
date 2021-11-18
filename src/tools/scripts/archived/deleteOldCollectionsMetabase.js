#!/usr/bin/env node
'use strict';

require('dotenv').config();

const { execute } = require('../../utils');

execute(__filename, async ({ db, logger, exit, Sentry }) => {
  logger.info('Suppression des 2 collections Metabase obsolètes');

  try {
    await db.collection('stats_ConseillersRecrutesStructure').drop();
    logger.info('Suppression collection stats_ConseillersRecrutesStructure OK');
    await db.collection('stats_PostesValidesStructure').drop();
    logger.info('Suppression collection stats_PostesValidesStructure OK');
    exit();
  } catch (error) {
    logger.error(error);
    Sentry.captureException(error);
  }

  logger.info(`Fin de suppression des collections Metabase obsolètes`);
});
