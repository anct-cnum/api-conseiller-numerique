#!/usr/bin/env node
/* eslint-disable guard-for-in */
'use strict';

const { execute } = require('../../utils');
const slugify = require('slugify');
const { v4: uuidv4 } = require('uuid');
const { createMailbox } = require('../../../utils/mailbox');

execute(__filename, async ({ db, logger, Sentry, exit, gandi }) => {
  try {
    logger.info('Recherche des conseillers sans mot de passe');
    let count = 0;
    const users = await db.collection('users').find({ roles: { $in: ['conseiller'] }, passwordCreated: false }).toArray();
    const sleep = ms => new Promise(r => setTimeout(r, ms));

    for (const idx in users) {
      const user = users[idx];

      const conseiller = await db.collection('conseillers').findOne({ _id: user.entity.oid });
      // Creation boite mail du conseiller
      const nom = slugify(`${conseiller.nom}`, { replacement: '-', lower: true, strict: true });
      const prenom = slugify(`${conseiller.prenom}`, { replacement: '-', lower: true, strict: true });
      let login = `${prenom}.${nom}`;
      let conseillerNumber = await db.collection('conseillers').countDocuments(
        {
          'emailCN.address': `${login}@${gandi.domain}`,
          'statut': 'RECRUTE'
        });
      if (conseillerNumber > 0) {
        let indexLoginConseiller = 1;
        do {
          login = `${prenom}.${nom}${indexLoginConseiller.toString()}`;
          conseillerNumber = await db.collection('conseillers').countDocuments(
            {
              'emailCN.address': `${login}@${gandi.domain}`,
              'statut': 'RECRUTE'
            });
          indexLoginConseiller += 1;
        } while (conseillerNumber !== 0);
      }
      const password = uuidv4() + 'AZEdsf;+:'; // Sera choisi par le conseiller via invitation
      await createMailbox({ gandi, db, logger, Sentry: Sentry })({ conseillerId: conseiller._id, login, password });
      count++;
      await sleep(7000);
    }
    logger.info(`${count} conseillers mis à jour`);
  } catch (error) {
    logger.error(error);
    Sentry.captureException(error);
    return;
  }
  exit();
});
