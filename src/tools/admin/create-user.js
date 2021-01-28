#!/usr/bin/env node
'use strict';

const { program } = require('commander');

require('dotenv').config();

const { execute } = require('../utils');

execute(async ({ feathers, db, logger, exit }) => {

  program.option('-n, --username <username>', 'username');
  program.option('-p, --password <password>', 'password');
  program.option('-r, --role <role>', 'role');
  program.parse(process.argv);

  const username = program.username;
  const password = program.password;
  const role = program.role;

  if (!username || !password || !role) {
    exit('Paramètres invalides');
  }

  if (!['admin', 'structure', 'conseiller'].includes(role)) {
    exit('Rôle non reconnu');
  }

  const count = await db.collection('users').countDocuments({ name: username});
  if (count > 0) {
    exit('Un utilisateur avec nom existe déjà');
  }
  await feathers.service('users').create({
    name: username,
    password: password,
    roles: Array(role)
  });
  logger.info('Utilisateur créé');
});
