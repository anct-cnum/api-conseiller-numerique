#!/usr/bin/env node
/* eslint-disable guard-for-in */
'use strict';

const ObjectID = require('mongodb').ObjectID;
const { program } = require('commander');

const { v4: uuidv4 } = require('uuid');

require('dotenv').config();

const { execute } = require('../../../utils');

const doCreateUser = async (db, feathers, dbName, _id, logger) => {
  return new Promise(async (resolve, reject) => {
    const structure = await db.collection('structures').findOne({ _id: _id, statut: 'VALIDATION_COSELEC' });
    try {
      await feathers.service('users').create({
        name: structure?.contact?.email.toLowerCase(),
        password: uuidv4(), // mandatory param
        roles: ['structure', 'structure_coop'],
        entity: {
          '$ref': `structures`,
          '$id': _id,
          '$db': dbName
        },
        token: uuidv4(),
        migrationDashboard: true,
        tokenCreatedAt: new Date(),
        mailSentDate: null, // on stock la date du dernier envoi de mail de création pour le mécanisme de relance
        passwordCreated: false,
        createdAt: new Date(),
      });
      await db.collection('structures').updateOne({ _id }, { $set: {
        userCreated: true
      } });
      resolve();
    } catch (e) {
      logger.warn(`Une erreur est survenue pour la structure id: ${structure._id} SIRET: ${structure?.siret}`);
      await db.collection('structures').updateOne({ _id }, { $set: {
        userCreationError: true
      } });
      reject();
    }
  });
};

execute(__filename, async ({ feathers, db, logger, exit, Sentry }) => {
  program.option('-a, --all', 'all: toutes les structures');
  program.option('-l, --limit <limit>', 'limit: limite le nombre de structures à traiter', parseInt);
  program.option('-i, --id <id>', 'id: une seule structure');
  program.helpOption('-e', 'HELP command');
  program.parse(process.argv);

  const quit = (usersCreatedCount, usersCreationErrorCount) => {
    logger.info(`${usersCreatedCount} utilisateurs créés, ${usersCreationErrorCount} utilisateurs en échec de création`);
    exit();
  };

  let { all, limit = 1, id } = program;

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
    const count = await db.collection('structures').countDocuments({ userCreated: true, _id: _id });
    if (count > 0) {
      exit('Un utilisateur existe déjà pour cette structure');
    }
    await doCreateUser(db, feathers, dbName, _id, logger, Sentry);
    usersCreatedCount++;
  } else {
    const structures = await db.collection('structures').find({ userCreated: false, userCreationError: { $ne: true }, statut: 'VALIDATION_COSELEC' }).toArray();
    let promises = [];
    structures.forEach(structure => {
      const p = new Promise(async (resolve, reject) => {
        const count = await db.collection('misesEnRelation').countDocuments({ 'structure': {
          '$ref': `structures`,
          '$id': structure._id,
          '$db': dbName
        } });
        if (count > 0) {
          doCreateUser(db, feathers, dbName, structure._id, logger, Sentry).then(() => {
            usersCreatedCount++;
            resolve();
            if (usersCreatedCount === limit) {
              quit(usersCreatedCount);
            }
          }).catch(() => {
            usersCreationErrorCount++;
            reject();
          });
        } else {
          resolve();
        }
      });
      promises.push(p);
    });
    await Promise.allSettled(promises);
  }

  quit(usersCreatedCount, usersCreationErrorCount);
});
