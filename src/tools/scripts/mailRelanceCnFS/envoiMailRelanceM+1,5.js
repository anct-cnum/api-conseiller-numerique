#!/usr/bin/env node
'use strict';

require('dotenv').config();

const { execute } = require('../../utils');
const dayjs = require('dayjs');
const cli = require('commander');
let { delay } = require('../../utils');

cli.description('Send emails for conseiller without deposit CRA after 1,5 month')
.option('--limit [optionLimit]', 'limit the number of emails sent (default: 1)', parseInt)
.option('--delay [optionDelay]', 'Time in milliseconds to wait before sending the next email (default: 100)', parseInt)
.helpOption('-e', 'HELP command')
.parse(process.argv);

const datePlus1MoisEtDemi = new Date(dayjs(Date.now()).subtract(45, 'day'));
execute(__filename, async ({ db, logger, Sentry, emails }) => {
  const { optionLimit = 20, optionDelay = 1000 } = cli;

  const conseillers = await db.collection('conseillers').find({
    'groupeCRA': { $eq: 4 },
    'groupeCRAHistorique': {
      $elemMatch: {
        'nbJourDansGroupe': { $exists: false },
        'dateDeChangement': { $lte: datePlus1MoisEtDemi },
        'mailSendConseillerM+1,5': { $exists: false }
      }
    }
  }).limit(optionLimit).toArray();

  for (const conseiller of conseillers) {
    try {
      const structure = await db.collection('structures').findOne({ _id: conseiller.structureId });
      const messageConseiller = emails.getEmailMessageByTemplateName('mailRelanceM+1,5Conseiller');
      const messageStructure = emails.getEmailMessageByTemplateName('mailRelanceM+1,5Structure');
      await messageConseiller.send(conseiller);
      await messageStructure.send(conseiller, structure.contact.email);
      if (optionDelay) {
        await delay(optionDelay);
      }
    } catch (e) {
      Sentry.captureException(e);
      logger.error(e);
    }
  }

  logger.info(`les mails de relance aux conseillers concernés ont été envoyés`);
});
