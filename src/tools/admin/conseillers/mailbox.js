#!/usr/bin/env node
'use strict';

const { program } = require('commander');
const axios = require('axios');
const slugify = require('slugify');
const { ObjectID } = require('mongodb');

require('dotenv').config();

const { execute } = require('../../utils');
const { createMailbox } = require('../../../utils/mailbox');

execute(__filename, async ({ logger, exit, app, db, Sentry }) => {

  program.option('-p, --password <password>', 'password: clear text');
  program.option('-i, --id <id>', 'id: MongoDB ObjecID');
  program.option('-a, --operation <operation>', 'operation: create / updatePassword');
  program.helpOption('-e', 'HELP command');
  program.parse(process.argv);

  const password = program.password;
  const operation = program.operation;
  const id = program.id;

  if (!password || !operation || !id) {
    exit('Paramètres invalides');
    return;
  }

  if (!['create', 'updatePassword'].includes(operation)) {
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

  const gandi = app.get('gandi');
  if (operation === 'create') {
    createMailbox({ gandi, db, logger, Sentry })({ conseillerId: conseiller._id, login, password });

  } else if (operation === 'updatePassword') {
    try {
      await axios({
        method: 'patch',
        url: `${gandi.endPoint}/mailboxes/${gandi.domain}/${conseiller.emailCN.id}`,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Apikey ${gandi.token}`
        },
        data: { 'login': login, 'password': password, 'aliases': [] }
      });
      logger.info('Boite email mise à jour');
    } catch (e) {
      e.response.data.errors.forEach(error => {
        logger.error(error.description);
      });
    }
  }
});
