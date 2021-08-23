#!/usr/bin/env node
'use strict';

const { program } = require('commander');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();
const { execute } = require('../../utils');

execute(__filename, async ({ feathers, db, logger, Sentry, exit }) => {

  program.option('-u, --username <username>', 'username');
  program.option('-p, --password <password>', 'password');
  program.option('-i, --id <id>', 'id MongoDB pour les structures et les conseillers');
  program.helpOption('-e', 'HELP command');
  program.parse(process.argv);

  const username = program.username.toLowerCase();
  const id = program.id;
  const password = program.password;

  if (!username || !password || !id) {
    exit('Paramètres invalides');
    return;
  }
  const count = await db.collection('users').countDocuments({ name: username });
  if (count > 0) {
    exit('Un utilisateur avec nom existe déjà');
  }
  const dbName = db.serverConfig.s.options.dbName;
  const structure = await db.collection('structures').findOne({ idPG: id });

  let user = {
    name: username,
    password: password,
    roles: ['structure'],
    token: uuidv4(),
    tokenCreatedAt: new Date(),
    mailSentDate: new Date(), // pour empecher l'envoi de l'email d'activation SA
    passwordCreated: false,
    createdAt: new Date(),
    entity: {
      '$ref': 'structures',
      '$id': structure._id,
      '$db': dbName
    },
    resend: false
  };
  
  try {
    await feathers.service('users').create(user);
  } catch (err) {

    logger.error(`[Multi Compte] Erreur lors de la création de l'user : ${err.message}`);
    Sentry.captureException(err.message);
  }

});
