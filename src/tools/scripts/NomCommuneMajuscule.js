#!/usr/bin/env node
'use strict';

const { execute } = require('../utils');

const updateCra = async db => await db.collection('cras').updateMany(
  { 'cra.nomCommune': /.*[a-z]+.*/ },
  [{ $set: { 'cra.nomCommune': { $toUpper: '$cra.nomCommune' } } }]
);
const updatePermanence = async db => await db.collection('permanences').updateMany(
  { 'adresse.ville': /.*[a-z]+.*/ },
  [{ $set: { 'adresse.ville': { $toUpper: '$adresse.ville' } } }]
);
execute(__filename, async ({ db, logger, exit, Sentry }) => {
  logger.info('Mise à jour des noms de commune en majuscule...');
  try {
    logger.info('Mise à jour des noms de commune en majuscule pour le cra...');
    updateCra(db);
    logger.info('Mise à jour des noms de commune en majuscule pour le formulaire de permanence...');
    updatePermanence(db);
  } catch (error) {
    logger.error(error);
    Sentry.captureException(error);
  }
  logger.info('Fin de la mise à jour des noms de commune en majuscule.');
  exit();
});
