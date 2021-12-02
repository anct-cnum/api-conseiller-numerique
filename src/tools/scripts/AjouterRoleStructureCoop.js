#!/usr/bin/env node
'use strict';

const { execute } = require('../utils');

const getUsersStructure = db => async role => await db.collection('users').find({ 'roles': { $in: [role] } }).toArray();

const isStructureAutorisee = db => async idStructure => await db.collection('conseiller').countDocuments({ 'structureId': idStructure });

const updateUserStructure = db => async idUser => {

};

execute(__filename, async ({ db, logger, exit, Sentry }) => {

  logger.info('Création du rôle structure_coop pour les structures possédants au moins un conseiller...');

  try {
    const usersStructure = await getUsersStructure(db)('structure');

    usersStructure.forEach(async structure => {
      const structureAutorisee = await isStructureAutorisee(db)(structure);
      console.log(structureAutorisee);
    });
  } catch (error) {
    logger.error(error);
    Sentry.captureException(error);
  }
  exit();
});
