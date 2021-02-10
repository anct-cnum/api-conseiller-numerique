#!/usr/bin/env node
'use strict';

const { program } = require('commander');
const axios = require('axios');
const slugify = require('slugify');

require('dotenv').config();

const { execute } = require('../../utils');

execute(async ({ feathers, logger, exit, app }) => {

  program.option('-p, --password <password>', 'password');
  program.option('-i, --id <id>', 'id');
  program.option('-a, --operation <operation>', 'operation');
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
    const uri = `${gandi.endPoint}/mailboxes/${gandi.domain}`;
    try {
      const result = await axios({
        method: 'post',
        url: uri,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Apikey ${gandi.token}`
        },
        data: { 'login': login, 'mailbox_type': 'standard', 'password': password, 'aliases': [] }
      });
      // TODO : récupérer l'uuid de la boite créé (problème dans l'api)
      await feathers.service('conseillers').patch(conseiller._id, { emailCN: `${login}@${gandi.domain}` });
      logger.info('Boite email créée');
    } catch (e) {
      e.response.data.errors.forEach(error => {
        logger.error(error.description);
      });
    }
  } else if (operation === 'updatePassword') {
    // TODO: ajouter l'uuid dans l'url
    // https://api.gandi.net/docs/email/
    const uri = `${gandi.endPoint}/mailboxes/${gandi.domain}`;
    try {
      await axios({
        method: 'patch',
        url: uri,
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
