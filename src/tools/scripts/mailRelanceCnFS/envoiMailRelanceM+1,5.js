#!/usr/bin/env node
'use strict';

require('dotenv').config();

const { execute } = require('../../utils');
const dayjs = require('dayjs');
const cli = require('commander');
let { delay } = require('../../utils');

cli.description('Send emails for conseiller without deposit CRA after 1,5 month')
.option('--limit [limit]', 'limit the number of emails sent (default: 1)', parseInt)
.option('--delai [delai]', 'Time in milliseconds to wait before sending the next email (default: 1000)', parseInt)
.helpOption('-e', 'HELP command')
.parse(process.argv);

const datePlus1MoisEtDemi = new Date(dayjs(Date.now()).subtract(45, 'day'));
const datePlus15jours = new Date(dayjs(Date.now()).subtract(15, 'day'));
execute(__filename, async ({ db, logger, Sentry, emails, app }) => {
  let { limit = 1, delai = 1000 } = cli;

  limit = app.get('limit_relance_cra') ?? limit;

  const conseillers = await db.collection('conseillers').find({
    'statut': { $eq: 'RECRUTE' },
    'estCoordinateur': { $ne: true },
    '$or': [
      {
        $and: [
          { 'groupeCRA': { $eq: 3 } },
          { 'groupeCRAHistorique': {
            $elemMatch: {
              'nbJourDansGroupe': { $exists: false },
              'mailSendConseillerM+1,5': { $exists: false },
              'dateDeChangement': { $lte: datePlus15jours },
            } } }
        ]
      },
      {
        $and: [
          { 'groupeCRA': { $eq: 4 } },
          { 'groupeCRAHistorique': {
            $elemMatch: {
              'nbJourDansGroupe': { $exists: false },
              'dateDeChangement': { $lte: datePlus1MoisEtDemi },
              'mailSendConseillerM+1,5': { $exists: false }
            } } }
        ]
      },
    ]
  }).limit(Number(limit)).toArray();

  for (const conseiller of conseillers) {
    try {
      const structure = await db.collection('structures').findOne({ _id: conseiller.structureId });
      const messageConseiller = emails.getEmailMessageByTemplateName('mailRelanceM+1,5Conseiller');
      const messageStructure = emails.getEmailMessageByTemplateName('mailRelanceM+1,5Structure');
      const messageSupHierarchique = emails.getEmailMessageByTemplateName('mailRelanceM+1,5SupHierarchique');
      await messageConseiller.send(conseiller);
      if (structure?.contact?.email) {
        await messageStructure.send(conseiller, structure.contact.email);
      }
      if (conseiller?.supHierarchique?.email && conseiller?.supHierarchique?.email !== structure?.contact?.email) {
        await messageSupHierarchique.send(conseiller);
      }
      if (delai) {
        await delay(delai);
      }
    } catch (e) {
      Sentry.captureException(e);
      logger.error(e);
    }
  }

  logger.info(`les mails de relance CRA à M+1,5 aux conseillers concernés ont été envoyés`);
});
