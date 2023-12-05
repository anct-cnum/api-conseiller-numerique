#!/usr/bin/env node
'use strict';

const { updateMailboxPassword } = require('../../utils/mailbox');
const { updateAccountPassword } = require('../../utils/mattermost');
const { execute, delay } = require('../utils');
const dayjs = require('dayjs');
const { v4: uuidv4 } = require('uuid');
const { program } = require('commander');
const winston = require('winston');

program.option('-l, --log', 'Création d\'un fichier de log pour les erreurs');
program.option('-limit, --limit <limit>', 'Nombre d\'utilisateur traités', parseInt);
program.parse(process.argv);

execute(__filename, async ({ exit, gandi, mattermost, logger, db, app, Sentry }) => {
  const { limit = 1000, log } = program;
  if (log) {
    logger.info('Création d\'un fichier de log pour les erreurs de réinitialisation de mot de passe...');
    logger.add(new winston.transports.File(
      {
        filename: `reset-password-cnil-${dayjs().format('YYYY-MM-DD_HH-mm-ss')}.log`,
        level: 'error',
      }
    ));
  }
  const users = await db.collection('users').find(
    {
      roles: { $in: ['conseiller', 'candidat'] },
      passwordCreated: true
    }
  ).limit(limit).toArray();
  let promises = [];
  logger.info('Réinitialisation des mots de passe de tous les conseillers et candidats...');
  users.forEach(user => {
    promises.push(new Promise(async (resolve, reject) => {
      const password = uuidv4() + 'AZEdsf;+:';
      try {
        await app.service('users').patch(user._id,
          {
            password,
            resetPasswordCnil: true,
          });
        if (user.roles.includes('conseiller')) {
          const conseiller = await db.collection('conseillers').findOne({ _id: user.entity.oid });
          const login = conseiller?.emailCN?.address.substring(0, conseiller?.emailCN?.address.lastIndexOf('@'));
          await updateMailboxPassword(gandi, conseiller._id, login, password, db, logger, Sentry);
          await updateAccountPassword(mattermost, db, logger, Sentry)(conseiller, password);
          await delay(1000);
        }
        resolve();
      } catch {
        logger.error(`Erreur lors de la réinitialisation du mot de passe de ${user._id}`);
        reject();
      }
    }));
  });
  await Promise.all(promises);
  exit();
});
