#!/usr/bin/env node
'use strict';

const ObjectID = require('mongodb').ObjectID;
const { program } = require('commander');

const { v4: uuidv4 } = require('uuid');

require('dotenv').config();

const { execute } = require('../../utils');

execute(__filename, async ({ feathers, db, logger, exit }) => {

  program.option('-u, --username <username>', 'username');
  program.option('-p, --password <password>', 'password');
  program.option('-d, --departement <departement>', 'departement');
  program.option('-r, --role <role>', 'role : choisir entre admin, structure, conseiller, prefet');
  program.option('-i, --id <id>', 'id pour les structures et les conseillers');
  program.helpOption('-e', 'HELP command');
  program.parse(process.argv);

  const username = program.username.toLowerCase();
  const password = program.password;
  const departement = program.departement;
  const role = program.role;
  const id = program.id;

  if (!username || !password || !role) {
    exit('Paramètres invalides');
  }

  if (!['admin', 'structure', 'conseiller', 'prefet'].includes(role)) {
    exit('Rôle non reconnu');
  }

  if (role === 'admin' || role === 'prefet') {
    if (id) {
      exit('Paramètre id interdit pour le rôle admin');
    }
  } else if (!id) {
    exit('Paramètre id obligatoire pour ce rôle');
    return;
  }

  if (role === 'prefet') {
    if (!departement) {
      exit('Paramètre département obligatoire pour le rôle préfet');
      return;
    }
  }

  const count = await db.collection('users').countDocuments({ name: username });
  if (count > 0) {
    exit('Un utilisateur avec nom existe déjà');
  }
  const dbName = db.serverConfig.s.options.dbName;

  let user = {
    name: username,
    password: password,
    roles: Array(role),
    token: uuidv4(),
    mailSentDate: null, // on stock la date du dernier envoi de mail de création pour le mécanisme de relance
    passwordCreated: true,
    createdAt: new Date(),
  };
  if (role === 'structure' || role === 'conseiller') {
    user.entity = {
      '$ref': `${role}s`,
      '$id': new ObjectID(id),
      '$db': dbName
    };
  } else if (role === 'prefet') {
    user.departement = departement;
  }

  await feathers.service('users').create(user);

  logger.info('Utilisateur créé');
});
