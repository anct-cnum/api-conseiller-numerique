#!/usr/bin/env node
'use strict';

const { execute } = require('../utils');

const getStructuresValidees = db => async () => await db.collection('structures').find(
  { 'statut': 'VALIDATION_COSELEC', 'userCreated': true }).toArray();

const isStructureAutorisee = db => async idStructure => await db.collection('misesEnRelation').countDocuments({ 'structure.$id': idStructure });

const updateUserStructure = db => async structureId => {
  await db.collection('users').updateMany(
    { 'entity.$id': structureId },
    { $set: { 'roles': ['structure', 'structure_coop'] } }
  );
};

execute(__filename, async ({ db, logger, exit, Sentry }) => {

  logger.info('Création du rôle structure_coop pour les structures étant validées coselec...');
  let nbAutorisees = 0;
  let nbStructures = 0;

  try {
    let promises = [];
    const structures = await getStructuresValidees(db)();
    structures.forEach(structure => {
      nbStructures++;
      promises.push(new Promise(async resolve => {
        const structureAutorisee = await isStructureAutorisee(db)(structure._id);
        if (structureAutorisee > 0) {
          nbAutorisees++;
          await updateUserStructure(db)(structure._id);
        }
        resolve();
      }));
    });
    await Promise.all(promises);
    await logger.info(nbStructures + ' structures ont été sélectionnées et ' + nbAutorisees + ' sont autorisées à avoir le nouveau rôle.');
  } catch (error) {
    logger.error(error);
    Sentry.captureException(error);
  }

  await logger.info('Fin de la création du rôle structure_coop pour les structures étant validées coselec.');
  exit();
});
