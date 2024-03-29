#!/usr/bin/env node
'use strict';

const { execute } = require('../../utils');
const { createMailbox, fixHomonymesCreateMailbox } = require('../../../utils/mailbox');
const slugify = require('slugify');
const { v4: uuidv4 } = require('uuid');

// On crée les comptes pour les 5 boites emails en erreurs
// Ils pourront utiliser la fonction "mot de passe oublié" pour se changer leur mot de passe et se connecter
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
      const login = await fixHomonymesCreateMailbox(gandi, nom, prenom, db);
      const password = uuidv4() + 'AZEdsf;+:!'; // pour respecter la règle de complexité de mot de passe
      await createMailbox({ gandi, db, logger, Sentry })({ conseillerId: conseiller._id, login, password });

      count++;
    } catch (e) {
      Sentry.captureException(e);
      logger.error(e);
    }

    // To avoid overload Gandi API
    await sleep(6000);
  }

  logger.info(`[GANDI MAILBOX]] ${count} comptes conseillers créés`);
});
