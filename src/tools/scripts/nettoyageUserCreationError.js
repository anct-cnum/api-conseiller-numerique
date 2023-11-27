#!/usr/bin/env node
'use strict';

const { program } = require('commander');
const { execute } = require('../utils');

const getElements = async (db, collection) => await db.collection(collection).find({
  userCreated: true, userCreationError: true
});

const getUserByEntity = db => async (id, roles) => await db.collection('users').findOne({
  'entity.$id': id,
  'roles': { '$in': roles }
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

  if (collection !== 'structures' && collection !== 'conseillers') {
    logger.error('Merci de renseigner une collection valide (structures ou conseillers).');
    exit();
    return;
  }
  const text = collection === 'structures' ? 'structure' : 'conseiller';

  const elements = await getElements(db, collection);

  logger.info('Début du traitement des ' + collection);
  const promises = [];
  elements.forEach(element => {
    promises.push(new Promise(async resolve => {
      let roles = [text];
      if (text !== 'structures') {
        roles.push('candidat');
      }
      const user = await getUserByEntity(db)(element._id, roles);
      if (user) {
        logger.info('Le ' + text + ' _id ' + element._id + ' a un user, suppression du status userCreationError');
        if (fix) {
          await deleteUserCreationError(db, collection)(element._id);
        }
      } else {
        logger.info('Le ' + text + ' _id ' + element._id + ' n\'a pas de user, correction du status userCreated');
        if (fix) {
          await updateUserCreated(db, collection)(element._id);
        }
      }
      resolve();
    }));
  });

  await Promise.all(promises);
  logger.info('Fin du traitement des ' + collection);


  logger.info('Fin du script de nettoyage des incohérences sur userCreationError');
  exit();
});
