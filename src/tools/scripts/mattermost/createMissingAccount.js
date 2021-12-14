#!/usr/bin/env node
'use strict';

const { execute } = require('../../utils');
const { loginAPI, searchUser, createAccount } = require('../../../utils/mattermost');
const slugify = require('slugify');
const { v4: uuidv4 } = require('uuid');

// On crée les comptes pour les 21 conseillers en erreurs
// Ils pourront utiliser la fonction "mot de passe oublié" pour se changer leur mot de passe et se connecter
execute(__filename, async ({ app, db, logger, Sentry }) => {
  const mattermost = app.get('mattermost');
  const token = await loginAPI({ mattermost });

  const sleep = ms => new Promise(r => setTimeout(r, ms));
  let count = 0;
  const conseillers = await db.collection('conseillers').find({
    'statut': { $ne: 'RUPTURE' },
    'mattermost.error': { $eq: true }
  }).toArray();

  for (const conseiller of conseillers) {
    try {
      const result = await searchUser(mattermost, token, conseiller);
      if (result.data.length === 0) {
        const nom = slugify(`${conseiller.nom}`, { replacement: '-', lower: true, strict: true });
        const prenom = slugify(`${conseiller.prenom}`, { replacement: '-', lower: true, strict: true });

        const login = `${prenom}.${nom}`;
        const gandi = app.get('gandi');
        const email = `${login}@${gandi.domain}`;
        const password = uuidv4() + 'AZEdsf;+:'; // pour respecter la règle de complexité de mot de passe

        createAccount({ mattermost, conseiller, email, login, nom, prenom, password, db, logger, Sentry });

        count++;
      }
    } catch (e) {
      Sentry.captureException(e);
      logger.error(e);
    }

    // To avoid overload Mattermost API
    await sleep(500);
  }

  logger.info(`[MATTERMOST] ${count} comptes conseillers créés`);
});
