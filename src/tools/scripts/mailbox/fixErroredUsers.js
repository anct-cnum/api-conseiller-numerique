#!/usr/bin/env node
'use strict';

const { execute } = require('../../utils');
const slugify = require('slugify');

// un bug par le passé a empêcher de stocker en base le login correctement alors que la boite a bien été créée avec succès
execute(__filename, async ({ app, db, logger, Sentry }) => {
  const gandi = app.get('gandi');

  const sleep = ms => new Promise(r => setTimeout(r, ms));
  let count = 0;
  const conseillers = await db.collection('conseillers').find({
    'statut': { $ne: 'RUPTURE' },
    'emailCNError': { $eq: true }
  }).toArray();

  for (const conseiller of conseillers) {
    try {
      const nom = slugify(`${conseiller.nom}`, { replacement: '-', lower: true, strict: true });
      const prenom = slugify(`${conseiller.prenom}`, { replacement: '-', lower: true, strict: true });

      const login = `${prenom}.${nom}`;
      await db.collection('conseillers').updateOne({ _id: conseiller._id },
        { $set:
          { emailCNError: false,
            emailCN: { address: `${login}@${gandi.domain}` } }
        });

      count++;
    } catch (e) {
      Sentry.captureException(e);
      logger.error(e);
    }

    // To avoid overload Mattermost API
    await sleep(500);
  }

  logger.info(`[MATTERMOST] ${count} comptes conseillers créés`);
});
