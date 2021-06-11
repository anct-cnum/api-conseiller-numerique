#!/usr/bin/env node
'use strict';

const { program } = require('commander');
const axios = require('axios');
const slugify = require('slugify');

require('dotenv').config();

const { execute } = require('../../utils');

execute(__filename, async ({ feathers, logger, exit, app }) => {

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
  }

  if (!['create', 'updatePassword'].includes(operation)) {
    exit('Action non reconnu');
  }

  const conseillers = await feathers.service('conseillers').find({
    query: {
      _id: id
    }
  });
  if (conseillers.total === 0) {
    exit('Conseiller introuvable');
  }

  const conseiller = conseillers.data[0];
  const login = slugify(`${conseiller.prenom}.${conseiller.nom}`).toLowerCase();

  const gandi = app.get('gandi');
  if (operation === 'create') {
    try {
      await axios({
        method: 'post',
        url: `${gandi.endPoint}/mailboxes/${gandi.domain}`,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Apikey ${gandi.token}`
        },
        data: { 'login': login, 'mailbox_type': 'standard', 'password': password, 'aliases': [] }
      });
      const result = await axios({
        method: 'get',
        url: `${gandi.endPoint}/mailboxes/${gandi.domain}?login=${login}`,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Apikey ${gandi.token}`
        }
      });
      // TODO : utiliser client mongo natif
      await feathers.service('conseillers').patch(conseiller._id, { emailCN: { address: result.data[0].address, id: result.data[0].id } });
      logger.info('Boite email créée');
    } catch (e) {
      e.response.data.errors.forEach(error => {
        logger.error(error.description);
      });
    }
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
