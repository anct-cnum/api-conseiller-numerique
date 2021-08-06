#!/usr/bin/env node
'use strict';

const { program } = require('commander');

require('dotenv').config();
const createEmails = require('../../../emails/emails');
const createMailer = require('../../../mailer');
const { execute } = require('../../utils');

execute(__filename, async ({ db, app, logger, Sentry }) => {

  program.option('-u, --username <username>', 'username');
  program.helpOption('-e', 'HELP command');
  program.parse(process.argv);

  const username = program.username.toLowerCase();

  if (!username) {
    logger.error('Paramètre invalide : ' + username);
    return;
  }

  const user = await db.collection('users').findOne({ name: username });
  if (!user) {
    logger.error('Aucun utilisateur avec cet email n\'existe ! \n Merci de passer par le script de création d\'un utilisateur.');
    return;
  }

  if (user.roles.includes('admin_coop')) {
    logger.error('L\'utilisateur a déjà un rôle admin COOP !');
    return;
  }
  try {
    logger.info('Ajout du rôle admin COOP pour:' + user.name);
    user.roles.push('admin_coop');
    db.collection('users').updateOne({ '_id': user._id }, {
      $set: {
        roles: user.roles
      }
    });
  } catch (error) {
    logger.error('Une erreur est survenue lors de la modification du user');
    Sentry.captureException(error);
  }

  try {
    logger.info('Envoi d\'un email d\'invitation à : ' + user.name);
    let mailer = createMailer(app);
    const emails = createEmails(db, mailer);
    let message = emails.getEmailMessageByTemplateName('invitationAdminEspaceCoopBDT');
    await message.send(user, user.name);
  } catch (error) {
    logger.error('Une erreur est survenue lors de l\'envoi du mail au user: ' + user._id);
    user.roles.pop();
    db.collection('users').updateOne({ '_id': user._id }, {
      $set: {
        roles: user.roles
      }
    });
    logger.error(error);
    Sentry.captureException(error);
    return;
  }

  logger.info('Rôle admin Coop ajouté');
});
