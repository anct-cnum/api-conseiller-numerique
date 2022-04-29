#!/usr/bin/env node
'use strict';

require('dotenv').config();

const { execute } = require('../../utils');
const dayjs = require('dayjs');
const createEmails = require('../../../emails/emails');
const createMailer = require('../../../mailer');

const datePlus1Mois = new Date(dayjs(Date.now()).subtract(1, 'month'));
execute(__filename, async ({ app, db, logger, Sentry }) => {
  const conseillers = await db.collection('conseillers').find({
    'groupeCRA': { $eq: 4 },
    '$expr': {
      '$and': [
        { '$eq': [{ '$year': [{ '$arrayElemAt': ['$groupeCRAHistorique.dateDeChangement', -1] }] }, datePlus1Mois.getFullYear()] },
        { '$eq': [{ '$month': [{ '$arrayElemAt': ['$groupeCRAHistorique.dateDeChangement', -1] }] }, datePlus1Mois.getMonth() + 1] },
        { '$eq': [{ '$dayOfMonth': [{ '$arrayElemAt': ['$groupeCRAHistorique.dateDeChangement', -1] }] }, datePlus1Mois.getDate()] }
      ]
    }
  }).toArray();

  for (const conseiller of conseillers) {
    try {
      let mailer = createMailer(app, conseiller.emailCN.address);
      const emails = createEmails(db, mailer);
      let message = emails.getEmailMessageByTemplateName('mailRelanceM+1Conseiller');
      await message.send(conseiller);
    } catch (e) {
      Sentry.captureException(e);
      logger.error(e);
    }
  }

  logger.info(`les mails de relance aux conseillers concernés ont été envoyés`);
});
