#!/usr/bin/env node
'use strict';

require('dotenv').config();
const { execute } = require('../utils');

/* mongodb -> 4.2
const updateCra = async db => await db.collection('cras').updateMany(
  {
    'cra.nomCommune': /.*[a-z]+.*/
/*},
  [{ $set: { 'cra.nomCommune': { $toUpper: '$cra.nomCommune' } } }]
);
const updatePermanence = async db => await db.collection('permanences').updateMany(
  { 'adresse.ville': /.*[a-z]+.*/
/*},
  [{ $set: { 'adresse.ville': { $toUpper: '$adresse.ville' } } }]
);
*/

const getCrasMinuscule = async db => await db.collection('cras').find({ 'cra.nomCommune': /.*[a-z]+.*/ });

const updateCra = async (db, cra) => await db.collection('cras').updateOne(
  { '_id': cra._id },
  { $set: { 'cra.nomCommune': cra.cra.nomCommune.toUpperCase() } }
);

const getPermanencesMinuscule = async db => await db.collection('permanences').find({ 'adresse.ville': /.*[a-z]+.*/ });

const updatePermanence = async (db, permanence) => await db.collection('permanences').updateOne(
  { '_id': permanence._id },
  { $set: { 'adresse.ville': permanence.adresse.ville.toUpperCase() } }
);

execute(__filename, async ({ db, logger, exit, Sentry }) => {
  logger.info('Mise à jour des noms de commune en majuscule...');
  try {
    logger.info('Mise à jour des noms de commune en majuscule pour le cra...');
    const cras = await getCrasMinuscule(db);
    cras.forEach(async cra => {
      await updateCra(db, cra);
    });

    logger.info('Mise à jour des noms de commune en majuscule pour le formulaire de permanence...');
    const permanences = await getPermanencesMinuscule(db);
    permanences.forEach(async permanence => {
      await updatePermanence(db, permanence);
    });
  } catch (error) {
    logger.error(error);
    Sentry.captureException(error);
  }
  logger.info('Fin de la mise à jour des noms de commune en majuscule.');
  exit();
});
