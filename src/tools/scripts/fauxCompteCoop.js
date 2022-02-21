#!/usr/bin/env node
'use strict';

const { execute } = require('../utils');
const { createMailbox, getMailBox } = require('../../utils/mailbox');
const { createAccount, loginAPI, searchUser } = require('../../utils/mattermost');
const slugify = require('slugify');
const { v4: uuidv4 } = require('uuid');

execute(__filename, async ({ logger, db, app, Sentry }) => {
  let countConseiller = 0;
  let countNotGandi = 0;
  let countNotMattermost = 0;
  const gandi = app.get('gandi');
  const mattermost = app.get('mattermost');
  const token = await loginAPI({ mattermost });
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const passwordcreatedTrue = await db.collection('users').find({ 'roles': { $in: ['conseiller'] }, 'passwordCreated': true }).toArray();

  for (const cnfs of passwordcreatedTrue) {
    try {
      const conseiller = await db.collection('conseillers').findOne({ _id: cnfs.entity.oid });
      if (!cnfs.mattermost && !cnfs.emailCN) {
        const nom = slugify(`${conseiller.nom}`, { replacement: '-', lower: true, strict: true });
        const prenom = slugify(`${conseiller.prenom}`, { replacement: '-', lower: true, strict: true });
        const login = `${prenom}.${nom}`;
        const password = uuidv4() + 'AZEdsf;+:';
        const conseillerId = conseiller._id;
        const email = `${login}@conseiller-numerique.fr`;
        const { data } = await getMailBox({ gandi, login });
        if (data.length === 0) {
          await createMailbox({ gandi, db, logger, Sentry })({ conseillerId, login, password });
          await db.collection('users').updateOne({ _id: conseillerId },
            { $set:
              { name: `${login}@${gandi.domain}` }
            });
          countNotGandi++;
        }
        const result = await searchUser(mattermost, token, conseiller);
        if (result.data.length === 0) {
          await createAccount({ mattermost, conseiller, email, login, nom, prenom, password, db, logger, Sentry });
          countNotMattermost++;
        }
        countConseiller++;
      }
    } catch (e) {
      Sentry.captureException(e);
      logger.error(e);
    }

    // To avoid overload Gandi API
    await sleep(500);
  }
  logger.info(`${countConseiller} conseillers qui n'ont pas activer leurs eespace via l'email d'invit COOP`);
  logger.info(`${countNotGandi} email @conseiller-numerique.fr corrigé(s)`);
  logger.info(`${countNotMattermost} email @conseiller-numerique.fr corrigé(s)`);

});
