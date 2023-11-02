#!/usr/bin/env node
'use strict';

const { program } = require('commander');
const { execute } = require('../utils');

const getStructures = async db => await db.collection('structures').find({
  userCreated: true, userCreationError: true
});

const getConseillers = async db => await db.collection('conseillers').find({
  userCreated: true, userCreationError: true
});

const getUserByEntity = db => async (id, role) => await db.collection('users').findOne({
  'entity.$id': id,
  'roles': { '$in': [role] }
});

const updateStructure = db => async structure => await db.collection('structures').replaceOne(
  { '_id': structure._id },
  structure
);

const updateConseiller = db => async conseiller => await db.collection('conseillers').replaceOne(
  { '_id': conseiller._id },
  conseiller
);

program.option('-f, --fix', 'fixer en base les statuts userCreated et userCreationError')
.option('-c, --collection', 'choisir d\'appliquer les corrections sur les conseillers ou sur les structures');

execute(__filename, async ({ exit, logger, db }) => {
  logger.info('Début du script de nettoyage des incohérences sur userCreationError');
  const { fix, collection } = program;

  if (collection === 'structures') {
    logger.info('Début du traitement des structures');
    const promisesStructures = [];
    const structures = await getStructures(db);

    structures.forEach(structure => {
      promisesStructures.push(new Promise(async resolve => {
        const user = await getUserByEntity(db)(structure._id, 'structure');
        if (user) {
          logger.info('La structure _id ' + structure._id + ' a un user, suppression du status userCreationError');
          delete structure.userCreationError;
        } else {
          logger.info('La structure _id ' + structure._id + ' n\'a pas de user, correction du status userCreated');
          structure.userCreated = false;
        }
        if (fix) {
          await updateStructure(db)(structure);
        }
        resolve();
      }));
    });

    await Promise.all(promisesStructures);
    logger.info('Fin du traitement des structures');

  } else if (collection === 'conseillers') {
    logger.info('Début du traitement des conseillers');
    const promisesConseillers = [];
    const conseillers = await getConseillers(db);

    conseillers.forEach(conseiller => {
      promisesConseillers.push(new Promise(async resolve => {
        const user = await getUserByEntity(db)(conseiller._id, 'conseiller');
        if (user) {
          logger.info('Le conseiller _id ' + conseiller._id + ' a un user, suppression du status userCreationError');
          delete conseiller.userCreationError;
        } else {
          logger.info('Le conseiller _id ' + conseiller._id + ' n\'a pas de user, correction du status userCreated');
          conseiller.userCreated = false;
        }
        if (fix) {
          await updateConseiller(db)(conseiller);
        }
        resolve();
      }));
    });

    await Promise.all(promisesConseillers);
    logger.info('Fin du traitement des conseillers');

  }

  logger.info('Fin du script de nettoyage des incohérences sur userCreationError');
  exit();
});
