#!/usr/bin/env node
'use strict';

const cli = require('commander');
const _ = require('lodash');
const sendCandidatEmails = require('./tasks/sendCandidatEmail');
const { capitalizeFirstLetter, execute } = require('../../../utils');

cli.description('Send new account emails')
.option('--type [type]', 'resend,send (default: send))', capitalizeFirstLetter)
.option('--limit [limit]', 'limit the number of emails sent (default: 1)', parseInt)
.option('--delay [delay]', 'Time in milliseconds to wait before sending the next email (default: 100)', parseInt)
.parse(process.argv);

execute(__filename, async ({ logger, db, app, emails, Sentry }) => {

  let { type = 'send', limit = 1, delay = 100 } = cli;

  logger.info('Envoi de l\'email de point sur le recrutement du candidat...');

  let ActionClass = require(`./tasks/actions/${_.capitalize(type)}Action`);
  let action = new ActionClass(app);

  try {
    let stats = await sendCandidatEmails(db, logger, emails, action, {
      limit,
      delay,
    });

    if (stats.total > 0) {
      logger.info(`[CONSEILLERS] Des emails sur le recrutement ont été envoyés à des candidats :  ` +
          `${stats.sent} envoyés / ${stats.error} erreurs`);
    }

    return stats;
  } catch (stats) {
    Sentry.captureException(stats);
    logger.info(`[CONSEILLERS] Une erreur est survenue lors de l'envoi des emails sur le recrutement aux candidats : ` +
        `${stats.sent} envoyés / ${stats.error} erreurs`);

    throw stats;
  }
}, { slack: cli.slack });
