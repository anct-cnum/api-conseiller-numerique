#!/usr/bin/env node
'use strict';

const { program } = require('commander');
const slugify = require('slugify');
const { ObjectID } = require('mongodb');

require('dotenv').config();

const { execute } = require('../../utils');
const { createAccount, updateAccountPassword } = require('../../../utils/mattermost');

execute(__filename, async ({ logger, exit, app, db, Sentry }) => {

  program.option('-p, --password <password>', 'password: clear text');
  program.option('-i, --id <id>', 'id: MongoDB ObjecID');
  program.option('-a, --operation <operation>', 'operation: create ou update');
  program.helpOption('-e', 'HELP command');
  program.parse(process.argv);

  const password = program.password;
  const operation = program.operation;
  const id = program.id;

  if (!password || !operation || !id) {
    exit('Paramètres invalides');
    return;
  }

  if (!['create', 'update'].includes(operation)) {
    exit('Action non reconnu');
    return;
  }

  const conseiller = await db.collection('conseillers').findOne({
    _id: new ObjectID(id)
  });

  if (conseiller === null) {
    exit('Conseiller introuvable');
    return;
  }

  const nom = slugify(`${conseiller.nom}`, { replacement: '-', lower: true, strict: true });
  const prenom = slugify(`${conseiller.prenom}`, { replacement: '-', lower: true, strict: true });
  const login = `${prenom}.${nom}`;
  const email = `${login}@conseiller-numerique.fr`;

  const mattermost = app.get('mattermost');
  if (operation === 'create') {
    await createAccount({ mattermost, conseiller, email, login, nom, prenom, password, db, logger, Sentry });
  }
  if (operation === 'update') {
    await updateAccountPassword(mattermost, db, logger, Sentry)(conseiller, password);
  }
});
