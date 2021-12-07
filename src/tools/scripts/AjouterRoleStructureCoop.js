#!/usr/bin/env node
'use strict';

const { execute } = require('../utils');

const getStructuresValidees = db => async skip => await db.collection('structures').find(
  { 'statut': 'VALIDATION_COSELEC', 'userCreated': true }).limit(1000).skip(skip).toArray();

const isStructureAutorisee = db => async idStructure => await db.collection('misesEnRelation').countDocuments({ 'structure.$id': idStructure });

const updateUserStructure = db => async structureId => {
  await db.collection('users').updateOne(
    { 'entity.$id': structureId },
    { $set: { 'roles': ['structure', 'structure_coop'] } }
  );
};

const skipArray = [0, 1000, 2000];

execute(__filename, async ({ db, logger, exit, Sentry }) => {

  logger.info('Création du rôle structure_coop pour les structures possédants au moins un conseiller...');

  try {
    skipArray.forEach(async skip => {
      const structures = await getStructuresValidees(db)(skip);
      structures.forEach(async structure => {
        const structureAutorisee = await isStructureAutorisee(db)(structure._id);
        if (structureAutorisee > 0) {
          await updateUserStructure(db)(structure._id);
        }

      });
    });

  } catch (error) {
    logger.error(error);
    Sentry.captureException(error);
  }

  await logger.info('Fin de la création du rôle structure_coop pour les structures possédants au moins un conseiller.');
  exit();
});
