#!/usr/bin/env node
'use strict';

const { execute } = require('../utils');

const getUsersStructure = db => async role => await db.collection('users').find({ 'roles': { $in: [role] } }).toArray();

const isStructureAutorisee = db => async idStructure => await db.collection('conseillers').findOne({ 'structureId': idStructure });

const updateUserStructure = db => async (idUser, roles) => await db.collection('users').updateOne(
  { _id: idUser },
  { $set: { roles: roles } }
);

execute(__filename, async ({ db, logger, exit, Sentry }) => {

  logger.info('Création du rôle structure_coop pour les structures possédants au moins un conseiller...');

  try {
    const usersStructure = await getUsersStructure(db)('structure');
    usersStructure.forEach(async userStructure => {
      const structureAutorisee = await isStructureAutorisee(db)(userStructure.entity.oid);
      if (structureAutorisee !== null) {
        userStructure.roles.push('structure_coop');
        await updateUserStructure(db)(userStructure._id, userStructure.roles);
      }
    });
  } catch (error) {
    logger.error(error);
    Sentry.captureException(error);
  }

  await logger.info('Fin de la création du rôle structure_coop pour les structures possédants au moins un conseiller.');
  exit();
});
