#!/usr/bin/env node
'use strict';

require('dotenv').config();

const sendEmailStructureCoop = require('./tasks/sendEmailStructureCoop.js');
const { execute } = require('../../../utils');
const cli = require('commander');

cli.description('Envoi des emails d\'invitation aux structures_coop')
.option('--limit [limit]', 'limit the number of emails sent (default: 1)', parseInt)
.option('--delay [delay]', 'Time in milliseconds to wait before sending the next email (default: 100)', parseInt)
.parse(process.argv);

execute(__filename, async ({ logger, db, emails, Sentry }) => {

  let { limit = 1, delay = 100 } = cli;

  logger.info('Envoi de l\'email de création de compte aux structures...');

  try {
    let stats = await sendEmailStructureCoop(db, logger, emails, { limit, delay });

    if (stats.total > 0) {
      logger.info(`[STRUCTURE] Envoi des emails d'invitation au BO coop aux structures :  ` +
          `${stats.sent} envoyés / ${stats.error} erreurs`);
    }

    return stats;
  } catch (stats) {
    Sentry.captureException(stats);
    logger.info(`[STRUCTURE] Une erreur est survenue lors de l'envoi des emails d'invitation au BO coop aux structures : ` +
        `${stats.sent} envoyés / ${stats.error} erreurs`);

    throw stats;
  }
}, { slack: cli.slack });
