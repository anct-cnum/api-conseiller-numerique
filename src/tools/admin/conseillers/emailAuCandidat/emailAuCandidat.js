#!/usr/bin/env node
'use strict';

const { program } = require('commander');
const capitalize = require('lodash.capitalize');
const sendCandidatEmail = require('./tasks/sendCandidatEmail');
const { capitalizeFirstLetter, execute } = require('../../../utils');

program.description('Envoi de l\'email de point sur le recrutement du candidat')
.option('--type [type]', 'resend,send (default: send))', capitalizeFirstLetter)
.option('--delay [delay]', 'Time in milliseconds to wait before sending the next email (default: 100)', parseInt)
.option('--limit [limit]', 'limit the number of emails sent (default: 1)', parseInt)
.parse(process.argv);

execute(__filename, async ({ logger, db, app, emails, Sentry, exit }) => {

  let { type = 'send', delay = 100, limit = 1 } = program.opts();

  logger.info('Envoi de l\'email de point sur le recrutement du candidat...');

  let ActionClass = require(`./tasks/actions/${capitalize(type)}Action`);
  let action = new ActionClass(app);

  try {
    let stats = await sendCandidatEmail(db, logger, emails, action, {
      limit,
      delay,
    }, Sentry, exit);

    if (stats.total > 0) {
      logger.info(`[CONSEILLERS] Des emails sur le recrutement ont été envoyés à des candidats :  ` +
          `${stats.sent} envoyés / ${stats.error} erreurs`);
    }

    return stats;
  } catch (err) {
    logger.info(`[CONSEILLERS] Une erreur est survenue lors de l'envoi des emails sur le recrutement aux candidats : ` +
    `${err}`);
    Sentry.captureException(err);
    throw err;
  }
}, { slack: program.slack });
