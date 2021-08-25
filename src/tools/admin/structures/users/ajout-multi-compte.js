#!/usr/bin/env node
'use strict';

const { program } = require('commander');
const { v4: uuidv4 } = require('uuid');
const { execute } = require('../../../utils');
require('dotenv').config();
const createMailer = require('../../../../mailer');
const createEmails = require('../../../../emails/emails');

execute(__filename, async ({ db, logger, exit, Sentry, app }) => {

  program.option('-u, --username <username>', 'username');
  program.option('-i, --id <id>', 'id MongoDB pour les structures et les conseillers');
  program.helpOption('-e', 'HELP command');
  program.parse(process.argv);

  const username = program.username;
  const id = program.id;

  if (!username || !id) {
    exit('Paramètres invalides');
    return;
  }

  const count = await db.collection('users').countDocuments({ name: username });
  if (count > 0) {
    exit(`Un utilisateur avec ${username} existe déjà`);
    return;
  }
  const { _id } = await db.collection('structures').findOne({ idPG: parseInt(id) });

  const dbName = db.serverConfig.s.options.dbName;
  const user = {
    name: username.toLowerCase(),
    password: uuidv4(),
    roles: ['structure'],
    entity: {
      '$ref': 'stuctures',
      '$id': _id,
      '$db': dbName
    },
    token: uuidv4(),
    tokenCreatedAt: new Date(),
    passwordCreated: false,
    createdAt: new Date(),
    resend: false,
    mailSentDate: new Date()
  };

  try {

    await db.collection('users').insertOne(user);
    let mailer = createMailer(app, username);
    const emails = createEmails(db, mailer);
    let message = emails.getEmailMessageByTemplateName('invitationCompteStructure');
    await message.send(user, username);
  } catch (error) {
    logger.error(error.message);
    Sentry.captureException(error);
    return;
  }

  logger.info(`compte avec l'email ${username} a bien été crée`);
});
