#!/usr/bin/env node
'use strict';

const { updateMailboxPassword } = require('../../utils/mailbox');
const { updateAccountPassword } = require('../../utils/mattermost');
const { execute, delay } = require('../utils');
const { v4: uuidv4 } = require('uuid');
const { program } = require('commander');
const winston = require('winston');

program.option('-l, --log', 'Création d\'un fichier de log pour les erreurs');
program.option('-r, --role <role>', 'Rôle des utilisateurs à réinitialiser (conseiller ou candidat');
program.option('-dr, --delayReset <delayReset>', 'Délai entre chaque réinitialisation de mot de passe (en ms)', parseInt);
program.parse(process.argv);

execute(__filename, async ({ exit, gandi, mattermost, logger, db, app, Sentry }) => {
  let roles = ['conseiller', 'candidat'];
  const { role, delayReset = 2000, log } = program;
  if (role) {
    if (!roles.includes(program.role)) {
      logger.error('Le rôle doit être conseiller ou candidat');
      exit();
      return;
    }
    roles = [program.role];
  }
  if (log) {
    logger.info('Création d\'un fichier de log pour les erreurs de réinitialisation de mot de passe...');
    logger.add(new winston.transports.File(
      {
        filename: `reset-password-cnil-${roles.length > 1 ? 'tous' : roles[0]}.log`,
        level: 'error',
      }
    ));
  }

  const users = await db.collection('users').find(
    {
      roles: { $in: roles },
      passwordCreated: true,
      resetPasswordCnil: { $exists: false },
    }
  ).toArray();
  let promises = [];
  logger.info('Réinitialisation des mots de passe de tous les conseillers et candidats...');
  users.forEach(user => {
    promises.push(new Promise(async (resolve, reject) => {
      try {
        const password = uuidv4() + 'AZEdsf;+:';
        if (user.roles.includes('conseiller')) {
          const conseiller = await db.collection('conseillers').findOne({ _id: user.entity.oid });
          const login = conseiller.emailCN.address.substring(0, conseiller?.emailCN?.address.lastIndexOf('@'));
          await updateMailboxPassword(gandi, conseiller._id, login, password, db, logger, Sentry);
          await updateAccountPassword(mattermost, db, logger, Sentry)(conseiller, password);
          await delay(delayReset);
        }
        await app.service('users').patch(user._id,
          {
            password,
            resetPasswordCnil: true,
          });
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
