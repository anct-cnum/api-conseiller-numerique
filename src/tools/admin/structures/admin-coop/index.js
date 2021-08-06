#!/usr/bin/env node
'use strict';
/*
              --------------------------------
              SCRIPT EN STANDBY POUR LE MOMENT
              --------------------------------

*/
require('dotenv').config();

const { v4: uuidv4 } = require('uuid');
const createEmails = require('../../../../emails/emails');
const createMailer = require('../../../../mailer');
const { execute } = require('../../../utils');

execute(__filename, async ({ db, app, logger, Sentry }) => {

  const envoyerEmailInvitation = async user => {
    try {
      logger.info('Envoi d\'un email d\'invitation à :' + user.name);
      let mailer = createMailer(app);
      const emails = createEmails(db, mailer);
      let message = emails.getEmailMessageByTemplateName('invitationAdminEspaceCoop');
      await message.send(user, user.name);

    } catch (error) {
      logger.error('Une erreur est survenue lors de l\'envoi du mail à :' + user.name);
      user.roles.pop();
      db.collection('users').updateOne({ '_id': user._id }, {
        $set: {
          roles: user.roles,
          token: null,
          tokenCreatedAt: null
        }
      });
      logger.error(error);
      Sentry.captureException(error);
    }
  };

  const userStructures = await db.collection('conseillers').aggregate(
    [
      { $match: { 'statut': { $eq: 'RECRUTE' }, 'structureId': { $ne: null } } },
      { $lookup: { from: 'users', localField: 'structureId', foreignField: 'entity.$id', as: 'userStructure' } },
      { $unwind: '$userStructure' },
      { $match: { 'userStructure.roles': { $ne: 'admin_coop' } } },
      { $group: { _id: '$userStructure' } }
    ]).toArray();

  if (userStructures.length > 0) {
    userStructures.forEach(userStructure => {
      const user = userStructure._id;
      try {
        user.token = uuidv4();
        user.tokenCreatedAt = new Date();
        user.roles.push('admin_coop');

        logger.info('Ajout du rôle admin COOP pour:' + user.name);
        db.collection('users').updateOne({ '_id': user._id }, {
          $set: {
            roles: user.roles,
            token: user.token,
            tokenCreatedAt: user.tokenCreatedAt
          }
        });

        envoyerEmailInvitation(user);

      } catch (error) {
        logger.error('Une erreur est survenue lors de la modification du user: ' + user._id);
        Sentry.captureException(error);
      }
    });
  } else {
    logger.info('Il n\'y a pas de structure à traiter');
  }
});
