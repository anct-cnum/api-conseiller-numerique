#!/usr/bin/env node
'use strict';

const { program } = require('commander');
const capitalize = require('lodash.capitalize');
const sendActivationCompteEmails = require('./tasks/sendCreateAccountEmail');
const { capitalizeFirstLetter, execute } = require('../../../utils');

program.description('Send new account emails')
.option('--departement [departement]', 'Département de la préfecture')
.option('--type [type]', 'resend,send (default: send))', capitalizeFirstLetter)
.option('--limit [limit]', 'limit the number of emails sent (default: 1)', parseInt)
.option('--delay [delay]', 'Time in milliseconds to wait before sending the next email (default: 100)', parseInt)
.parse(process.argv);

execute(__filename, async ({ logger, db, app, emails, Sentry }) => {

  let { type = 'send', departement, limit = 1, delay = 100 } = program.opts();

  logger.info('Envoi de l\'email de création de compte aux utilisateurs en préfecture...');

  let ActionClass = require(`./tasks/actions/${capitalize(type)}Action`);
  let action = new ActionClass(app);

  try {
    let stats = await sendActivationCompteEmails(db, logger, emails, action, {
      departement,
      limit,
      delay,
    });

    if (stats.total > 0) {
      logger.info(`[PREFET] Des emails de création de compte ont été envoyés à des préfectures :  ` +
          `${stats.sent} envoyés / ${stats.error} erreurs`);
    }

    return stats;
  } catch (stats) {
    Sentry.captureException(stats);
    logger.info(`[PREFET] Une erreur est survenue lors de l'envoi des emails de création de compte aux préfets : ` +
        `${stats.sent} envoyés / ${stats.error} erreurs`);

    throw stats;
  }
}, { slack: program.slack });
