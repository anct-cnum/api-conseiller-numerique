#!/usr/bin/env node
'use strict';

const ObjectID = require('mongodb').ObjectID;
const { program } = require('commander');

const { v4: uuidv4 } = require('uuid');

require('dotenv').config();

const { execute } = require('../../../utils');

const doCreateUser = async (db, feathers, dbName, _id, logger, Sentry) => {
  return new Promise(async (resolve, reject) => {
    const conseillerDoc = await db.collection('conseillers').findOne({ _id: _id });
    try {
      //Bridage si doublon recruté (ou en rupture : le process fait un switch compte coop en candidat)=> pas de création de compte candidat
      const hasUserCoop = await db.collection('conseillers').countDocuments({ statut: { $exists: true }, email: conseillerDoc.email });
      const userExists = await db.collection('users').countDocuments({ name: conseillerDoc.email });

      if ((hasUserCoop === 0) && (userExists === 0)) {
        await feathers.service('users').create({
          name: conseillerDoc.email,
          prenom: conseillerDoc.prenom,
          nom: conseillerDoc.nom,
          password: uuidv4(), // mandatory param
          roles: Array('candidat'),
          entity: {
            '$ref': `conseillers`,
            '$id': _id,
            '$db': dbName
          },
          token: uuidv4(),
          tokenCreatedAt: new Date(),
          mailSentDate: null, // on stock la date du dernier envoi de mail de création pour le mécanisme de relance
          passwordCreated: false,
          createdAt: new Date(),
        });
        await db.collection('conseillers').updateOne({ _id }, { $set: {
          userCreated: true
        },
        $unset: {
          userCreationError: ''
        } });
      } else {
        await db.collection('conseillers').updateOne({ _id }, { $set: {
          userCreated: false,
          userCreationError: true
        } });
      }
      resolve();
    } catch (e) {
      Sentry.captureException(e);
      logger.error(`Une erreur est survenue pour la création de l'utilisateur du conseiller id: ${conseillerDoc._id}`);
      await db.collection('conseillers').updateOne({ _id }, { $set: {
        userCreated: false,
        userCreationError: true
      } });
      reject();
    }
  });
};

execute(__filename, async ({ feathers, db, logger, exit, Sentry }) => {
  program.option('-a, --all', 'all: tout les candidats');
  program.option('-l, --limit <limit>', 'limit: limite le nombre de candidats à traiter', parseInt);
  program.option('-i, --id <id>', 'id: une seul candidat');
  program.helpOption('-e', 'HELP command');
  program.parse(process.argv);

  const quit = (usersCreatedCount, usersCreationErrorCount) => {
    logger.info(`${usersCreatedCount} utilisateurs créés, ${usersCreationErrorCount} utilisateurs en échec de création`);
    exit();
  };

  let { all, limit = 1, id } = program.opts();

  let usersCreatedCount = 0;
  let usersCreationErrorCount = 0;

  const dbName = db.serverConfig.s.options.dbName;

  if (!(!(!all && id) ^ !(all && !id))) {
    exit('Paramètres invalides. Veuillez précisez un id ou le paramètre all');
  }

  if (all && !limit) {
    exit('Paramètres invalides. La limit est obligatoire avec le paramètre all.');
  }

  if (id) {
    const _id = new ObjectID(id);
    const count = await db.collection('conseillers').countDocuments({ userCreated: true, _id: _id });
    if (count > 0) {
      exit('Un utilisateur existe déjà pour ce conseiller');
    }
    await doCreateUser(db, feathers, dbName, _id, logger, Sentry);
    usersCreatedCount++;
  } else {
    const conseillers = await db.collection('conseillers').find({
      inactivite: { $ne: true },
      userCreated: false,
      disponible: true, // si un des doublons a le statut RECRUTE, le disponible est passé à false
      userCreationError: { $ne: true },
      statut: { $ne: 'RECRUTE' }
    }, { limit: limit }).toArray();

    let conseillersSansDoublon = [];
    let alreadySeen = [];
    for (const conseiller of conseillers) {
      if (alreadySeen[conseiller.email]) {
        await db.collection('conseillers').updateOne({ _id: conseiller._id }, { $set: {
          userCreationError: true,
          userCreated: false,
        } });
      } else {
        alreadySeen[conseiller.email] = true;
        conseillersSansDoublon.push(conseiller);
      }
    }
    let promises = [];
    conseillersSansDoublon.forEach(candidat => {
      const p = new Promise(async (resolve, reject) => {
        doCreateUser(db, feathers, dbName, candidat._id, logger, Sentry).then(() => {
          usersCreatedCount++;
          resolve();
        }).catch(() => {
          usersCreationErrorCount++;
          reject();
        });
      });
      promises.push(p);
    });
    await Promise.allSettled(promises);
  }

  quit(usersCreatedCount, usersCreationErrorCount);
});
