#!/usr/bin/env node
'use strict';

const { updateMailboxPassword } = require('../../utils/mailbox');
const { updateAccountPassword } = require('../../utils/mattermost');
const { execute } = require('../utils');
const { v4: uuidv4 } = require('uuid');

execute(__filename, async ({ exit, gandi, mattermost, logger, db, app, Sentry }) => {
  const users = await db.collection('users').find(
    {
      roles: { $in: ['conseiller', 'candidat'] },
      passwordCreated: true
    }
  ).toArray();
  let promises = [];

  logger.info('Réinitialisation des mots de passe de tous les conseillers et candidats...');
  users.forEach(user => {
    promises.push(new Promise(async (resolve, reject) => {
      const conseiller = await db.collection('conseillers').findOne({ _id: user.entity.oid });
      const password = uuidv4() + 'AZEdsf;+:';
      const userUpdatedPassword = await app.service('users').patch(user._id,
        {
          password,
          resetPasswordCnil: true,
        }).catch(err => new Error(err));
      if (userUpdatedPassword instanceof Error) {
        logger.error(`Erreur lors de la réinitialisation du mot de passe de ${user._id}`);
        reject();
        return;
      }
      const userUpdated = await db.collection('users').updateOne(
        {
          _id: user._id
        },
        {
          $unset: {
            passwordCreatedAt: '',
          }
        }
      );
      if (userUpdated.modifiedCount === 1) {
        if (conseiller?.emailCN?.address) {
          const login = conseiller?.emailCN?.address.substring(0, conseiller?.emailCN?.address.lastIndexOf('@'));
          const mailboxUpdated = await updateMailboxPassword(gandi, conseiller._id, login, password, db, logger, Sentry);
          if (!mailboxUpdated) {
            logger.error(`Erreur lors de la réinitialisation du mot de passe du compte gandi ${login}`);
          }
        }
        if (conseiller?.mattermost?.id) {
          const mattermostUpdated = await updateAccountPassword(mattermost, db, logger, Sentry)(conseiller, password);
          if (!mattermostUpdated) {
            logger.error(`Erreur lors de la réinitialisation du mot de passe du compte mattermost ${conseiller.mattermost.id}`);
          }
        }
      } else {
        logger.error(`Erreur lors de la suppression du flag passwordCreatedAt de ${user._id}`);
      }
      resolve();
    }));
  });
  await Promise.all(promises);
  exit();
});
