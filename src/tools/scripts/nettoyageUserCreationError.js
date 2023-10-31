#!/usr/bin/env node
'use strict';

const { execute } = require('../utils');
const { DBRef } = require('mongodb');

const getStructures = async db => await db.collection('structures').find({
  userCreated: true, userCreationError: true
});

const getConseillers = async db => await db.collection('conseillers').find({
  userCreated: true, userCreationError: true
});

const getUserByEntity = db => async entity => await db.collection('users').findOne({
  'entity': entity
});

const updateStructure = db => async structure => await db.collection('structures').replaceOne(
  { '_id': structure._id },
  structure
);

const updateConseiller = db => async conseiller => await db.collection('conseillers').replaceOne(
  { '_id': conseiller._id },
  conseiller
);
execute(__filename, async ({ exit, logger, app, db }) => {
  logger.info('Début du script de nettoyage des incohérences sur userCreationError');
  const connection = app.get('mongodb');
  const database = connection.substr(connection.lastIndexOf('/') + 1);

  logger.info('Début du traitement des structures');
  const promisesStructures = [];
  const structures = await getStructures(db);

  structures.forEach(structure => {
    promisesStructures.push(new Promise(async resolve => {
      const user = await getUserByEntity(db)(new DBRef('structures', structure._id, database));
      if (user) {
        logger.info('La structure _id ' + structure._id + ' a un user, suppression du status userCreationError');
        delete structure.userCreationError;
      } else {
        logger.info('La structure _id ' + structure._id + ' n\'a pas de user, correction du status userCreated');
        structure.userCreated = false;
      }
      await updateStructure(db)(structure);
      resolve();
    }));
  });

  await Promise.all(promisesStructures);
  logger.info('Fin du traitement des structures');

  logger.info('Début du traitement des conseillers');
  const promisesConseillers = [];
  const conseillers = await getConseillers(db);

  conseillers.forEach(conseiller => {
    promisesConseillers.push(new Promise(async resolve => {
      const user = await getUserByEntity(db)(new DBRef('conseillers', conseiller._id, database));
      if (user) {
        logger.info('Le conseiller _id ' + conseiller._id + ' a un user, suppression du status userCreationError');
        delete conseiller.userCreationError;
      } else {
        logger.info('Le conseiller _id ' + conseiller._id + ' n\'a pas de user, correction du status userCreated');
        conseiller.userCreated = false;
      }
      await updateConseiller(db)(conseiller);
      resolve();
    }));
  });

  await Promise.all(promisesConseillers);
  logger.info('Début du traitement des conseillers');

  logger.info('Fin du script de nettoyage des incohérences sur userCreationError');
  exit();
});
