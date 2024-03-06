#!/usr/bin/env node
'use strict';

const slugify = require('slugify');
const { v4: uuidv4 } = require('uuid');
const { execute } = require('../utils');
const { createAccount, fixHomonymesCreateMattermost } = require('../../utils/mattermost');

// node src/tools/scripts/mattermostDataRecette.js

execute(__filename, async ({ db, logger, Sentry, exit, app }) => {

  const mattermost = app.get('mattermost');
  const mongodb = app.get('mongodb');
  const gandi = app.get('gandi');
  const whiteList = ['local', 'recette'];
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  // eslint-disable-next-line max-len
  if ((!process.env.PGHOST.includes('local') && !process.env.PGHOST.includes('test')) || !whiteList.includes(process.env.SENTRY_ENVIRONMENT.toLowerCase()) || (!mongodb.includes('local') && !mongodb.includes('bezikra')) || (process.env.CAN_ANONYMIZE_FAKER !== 'true')) {
    exit('Ce script ne peut être lancé qu\'en local ou en recette !');
    return;
  }
  const conseillers = await db.collection('conseillers').find({
    'statut': 'RECRUTE',
    'mattermost.id': { '$exists': true },
    'createdMattermostRecette': { '$exists': false },
  }).toArray();

  logger.info(`Il y a ${conseillers.length} conseiller(s) à traiter.`);

  for (const conseiller of conseillers) {
    try {
      const nom = slugify(`${conseiller.nom}`, { replacement: '-', lower: true, strict: true });
      const prenom = slugify(`${conseiller.prenom}`, { replacement: '-', lower: true, strict: true });
      const login = await fixHomonymesCreateMattermost(nom, prenom, conseiller, db);
      const email = `${login}@${gandi.domain}`;
      const password = `Mp:!;?.20#${uuidv4()}`;
      await createAccount({ mattermost, conseiller, email, login, nom, prenom, password, db, logger, Sentry });
      await db.collection('conseillers').updateOne({ _id: conseiller._id }, { $set: { createdMattermostRecette: true } });
      await sleep(500);
    } catch (error) {
      logger.error(error);
      Sentry.captureException(error);
    }
  }
  exit();
});
