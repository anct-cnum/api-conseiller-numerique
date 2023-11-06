#!/usr/bin/env node
'use strict';

const { program } = require('commander');
const { execute } = require('../utils');

const getElements = async (db, collection) => await db.collection(collection).find({
  userCreated: true, userCreationError: true
});

const getUserByEntity = db => async (id, role) => await db.collection('users').findOne({
  'entity.$id': id,
  'roles': { '$in': [role] }
});

const updateUserCreated = (db, collection) => async id => await db.collection(collection).updateOne(
  { '_id': id },
  { '$set': { 'userCreated': false } }
);

const deleteUserCreationError = (db, collection) => async id => await db.collection(collection).updateOne(
  { '_id': id },
  { '$unset': { 'userCreationError': '' } }
);

program.option('-f, --fix', 'fixer en base les statuts userCreated et userCreationError');
program.option('-c, --collection <collection>', 'choisir d\'appliquer les corrections sur les conseillers ou sur les structures');
program.parse(process.argv);

execute(__filename, async ({ exit, logger, db }) => {
  logger.info('Début du script de nettoyage des incohérences sur userCreationError');
  const { fix, collection } = program;

  if (collection !== 'structures' || collection !== 'conseillers') {
    logger.error('Merci de renseigner une collection valide (structures ou conseillers).');
    exit();
  }

  const elements = await getElements(db, collection);

  if (collection === 'structures') {
    logger.info('Début du traitement des structures');
    const promisesStructures = [];
    elements.forEach(structure => {
      promisesStructures.push(new Promise(async resolve => {
        const user = await getUserByEntity(db)(structure._id, 'structure');
        if (user) {
          logger.info('La structure _id ' + structure._id + ' a un user, suppression du status userCreationError');
          if (fix) {
            await deleteUserCreationError(db, collection)(structure._id);
          }
        } else {
          logger.info('La structure _id ' + structure._id + ' n\'a pas de user, correction du status userCreated');
          if (fix) {
            await updateUserCreated(db, collection)(structure._id);
          }
        }
        resolve();
      }));
    });
    await Promise.all(promisesStructures);
    logger.info('Fin du traitement des structures');
  } else if (collection === 'conseillers') {
    logger.info('Début du traitement des conseillers');
    const promisesConseillers = [];
    elements.forEach(conseiller => {
      promisesConseillers.push(new Promise(async resolve => {
        const user = await getUserByEntity(db)(conseiller._id, 'conseiller');
        if (user) {
          logger.info('Le conseiller _id ' + conseiller._id + ' a un user, suppression du status userCreationError');
          if (fix) {
            await deleteUserCreationError(db, collection)(conseiller._id);
          }
        } else {
          logger.info('Le conseiller _id ' + conseiller._id + ' n\'a pas de user, correction du status userCreated');
          if (fix) {
            await updateUserCreated(db, collection)(conseiller._id);
          }
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
