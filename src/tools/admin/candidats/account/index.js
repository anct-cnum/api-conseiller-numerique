#!/usr/bin/env node
'use strict';

const { program } = require('commander');
const capitalize = require('lodash.capitalize');
const sendActivationCompteEmails = require('./tasks/sendCreateAccountEmail');
const { capitalizeFirstLetter, execute } = require('../../../utils');

program.description('Send new coop account emails')
.option('--type [type]', 'resend,send,force (default: send))', capitalizeFirstLetter)
.option('--limit [limit]', 'limit the number of emails sent (default: 1)', parseInt)
.option('--delay [delay]', 'Time in milliseconds to wait before sending the next email (default: 100)', parseInt)
.helpOption('-e', 'HELP command')
.parse(process.argv);

execute(__filename, async ({ logger, db, app, emails, Sentry }) => {

  let { type = 'send', limit = 1, delay = 100 } = program.opts();

  logger.info('Envoi de l\'email de création de compte aux conseillers...');

  let ActionClass = require(`./tasks/actions/${capitalize(type)}Action`);
  let action = new ActionClass(app);

  try {
    let stats = await sendActivationCompteEmails(db, logger, emails, Sentry, action, {
      limit,
      delay,
    });

    if (stats.total > 0) {
      logger.info(`[CONSEILLER CANDIDAT] Des emails de création de compte ont été envoyés à des conseillers candidats :  ` +
          `${stats.sent} envoyés / ${stats.error} erreurs`);
    }

    return stats;
  } catch (err) {
    logger.info(`[CONSEILLER CANDIDAT] Une erreur est survenue lors de l'envoi des emails de création de compte aux conseillers candidats : ` +
        `${err}`);
    Sentry.captureException(err);
    throw err;
  }
}, { slack: program.slack });
