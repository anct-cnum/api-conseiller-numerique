#!/usr/bin/env node
'use strict';

const { program } = require('commander');
const axios = require('axios');
const slugify = require('slugify');
const { ObjectID } = require('mongodb');

require('dotenv').config();

const { execute } = require('../../utils');
const { createMailbox, fixHomonymesCreateMailbox } = require('../../../utils/mailbox');

execute(__filename, async ({ logger, exit, app, db, Sentry }) => {

  program.option('-p, --password <password>', 'password: clear text');
  program.option('-i, --id <id>', 'id: MongoDB ObjecID');
  program.option('-a, --operation <operation>', 'operation: create / updatePassword');
  program.helpOption('-e', 'HELP command');
  program.parse(process.argv);

  const password = program.opts().password;
  const operation = program.opts().operation;
  const id = program.opts().id;

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
  const gandi = app.get('gandi');
  if (operation === 'create') {
    const login = await fixHomonymesCreateMailbox(gandi, nom, prenom, db);
    await createMailbox({ gandi, db, logger, Sentry })({ conseillerId: conseiller._id, login, password });

  } else if (operation === 'updatePassword') {
    const email = conseiller.emailCN.address;
    const login = email.match(`^${prenom}.${nom}?[0-9]?`);
    try {
      await axios({
        method: 'patch',
        url: `${gandi.endPoint}/mailboxes/${gandi.domain}/${conseiller.emailCN.id}`,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${gandi.token}`
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
