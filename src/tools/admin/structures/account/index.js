#!/usr/bin/env node
'use strict';

const cli = require('commander');
const _ = require('lodash');
const sendActivationCompteEmails = require('./tasks/sendCreateAccountEmail');
const { capitalizeFirstLetter, execute } = require('../../../utils');

cli.description('Send new account emails')
  .option('--siret [siret]', 'Siret of a specific organisme')
  .option('--type [type]', 'resend,send (default: send))', capitalizeFirstLetter)
  .option('--limit [limit]', 'limit the number of emails sent (default: 1)', parseInt)
  .option('--delay [delay]', 'Time in milliseconds to wait before sending the next email (default: 100)', parseInt)
  .parse(process.argv);

execute(async ({ logger, db, app, emails }) => {

  let { type = 'send', siret, limit = 1, delay = 100 } = cli;

  logger.info('Envoi de l\'email de création de compte aux structures...');

  let ActionClass = require(`./tasks/actions/${_.capitalize(type)}Action`);
  let action = new ActionClass(app);

  try {
    let stats = await sendActivationCompteEmails(db, logger, emails, action, {
      siret,
      limit,
      delay,
    });

    if (stats.total > 0) {
      logger.info(`[STRUCTURE] Des emails de création de compte ont été envoyés à des structures :  ` +
          `${stats.sent} envoyés / ${stats.error} erreurs`);
    }

    return stats;
  } catch (stats) {
    logger.info(`[STRUCTURE] Une erreur est survenue lors de l'envoi des emails de création de compte aux structures : ` +
        `${stats.sent} envoyés / ${stats.error} erreurs`);

    throw stats;
  }
}, { slack: cli.slack });
