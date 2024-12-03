#!/usr/bin/env node
'use strict';

require('dotenv').config();
const CSVToJSON = require('csvtojson');
const { execute } = require('../../utils');
const { program } = require('commander');
const { v4: uuidv4 } = require('uuid');

program.option('-c, --csv <path>', 'CSV file path').parse(process.argv);

const readCSV = async filePath => {
  try {
    return await CSVToJSON({ delimiter: 'auto' }).fromFile(filePath);
  } catch (err) {
    throw err;
  }
};

execute(__filename, async ({ feathers, db, logger, emails, Sentry }) => {

  let promises = [];

  await new Promise(resolve => {
    readCSV(program.opts().csv).then(async hubUsers => {

      const total = hubUsers.length;
      let count = 0;
      let ok = 0;
      let errors = 0;

      const capitalize = word => {
        return word.charAt(0).toUpperCase() + word.slice(1);
      };

      const messageInvitationHub = emails.getEmailMessageByTemplateName('creationCompteHub');

      hubUsers.forEach(hubUser => {
        let p = new Promise(async (resolve, reject) => {

          const email = hubUser.email.trim().toLowerCase();
          const nom = capitalize(hubUser.nom.trim().toLowerCase());
          const prenom = capitalize(hubUser.prenom.trim().toLowerCase());
          const existUser = await db.collection('users').countDocuments({ name: email });

          if (existUser !== 0) {
            logger.error(`Email déjà utilisé pour ${email}`);
            errors++;
            reject();
          } else if (email === '' || nom === '' || prenom === '' || hubUser.hub === '') {
            logger.error(`Information manquante pour ${email}`);
            errors++;
            reject();
          } else {
            //Creation du user
            const user = {
              name: email,
              nom,
              prenom,
              password: uuidv4(), // mandatory param
              roles: ['hub_coop'],
              hub: hubUser.hub,
              token: uuidv4(),
              tokenCreatedAt: new Date(),
              mailSentDate: new Date(),
              passwordCreated: false,
              createdAt: new Date(),
            };
            await feathers.service('users').create(user);

            //Envoi du mail d'inscription
            await messageInvitationHub.send(user);

            logger.info(`Utilisateur créé pour ${email}`);
            ok++;
            resolve();
          }
          count++;
          if (total === count) {
            logger.info(`[HUB COOP] Des utilisateurs ont été créés :  ` +
                `${ok} créé(s) / ${errors} erreur(s)`);
          }
        });
        promises.push(p);
      });
      resolve();
    }).catch(error => {
      logger.error(error);
      Sentry.captureException(error);
    });
  });
  await Promise.allSettled(promises);
});
