#!/usr/bin/env node
'use strict';

require('dotenv').config();
const { execute } = require('../utils');

const countCrasMinuscule = async db => await db.collection('cras').countDocuments({ 'cra.nomCommune': /.*[a-z]+.*/ });
const getCrasMinuscule = async db => await db.collection('cras').find({ 'cra.nomCommune': /.*[a-z]+.*/ }).toArray();
const updateCra = async (db, cra) => await db.collection('cras').updateOne(
  { '_id': cra._id },
  { $set: { 'cra.nomCommune': cra.cra.nomCommune.toUpperCase() } }
);

const countPermanencesMinuscule = async db => await db.collection('permanences').countDocuments({ 'adresse.ville': /.*[a-z]+.*/ });
const getPermanencesMinuscule = async db => await db.collection('permanences').find({ 'adresse.ville': /.*[a-z]+.*/ }).toArray();
const updatePermanence = async (db, permanence) => await db.collection('permanences').updateOne(
  { '_id': permanence._id },
  { $set: { 'adresse.ville': permanence.adresse.ville.toUpperCase() } }
);

execute(__filename, async ({ db, logger, exit, Sentry }) => {
  logger.info('Mise à jour des noms de commune en majuscule...');
  try {
    let promiseCras = [];
    let promisePermanences = [];

    const countCras = await countCrasMinuscule(db);
    let countCrasUpdated = 0;

    const countPermanences = await countPermanencesMinuscule(db);
    let countPermanencesUpdated = 0;
    logger.info('Mise à jour des noms de commune en majuscule pour le cra...');
    const cras = await getCrasMinuscule(db);

    cras.forEach(async cra => {
      promiseCras.push(new Promise(async resolve => {
        await updateCra(db, cra);
        logger.info('Mise à jour du cra ' + cra._id);
        countCrasUpdated++;
        resolve();
      }));
    });
    await Promise.all(promiseCras);
    logger.info('Mise à jour des cras effectuée (' + countCrasUpdated + ' / ' + countCras + ')');

    logger.info('Mise à jour des noms de commune en majuscule pour le formulaire de permanence...');
    const permanences = await getPermanencesMinuscule(db);
    permanences.forEach(async permanence => {
      promisePermanences.push(new Promise(async resolve => {
        await updatePermanence(db, permanence);
        logger.info('Mise à jour de la permanence ' + permanence._id);
        countPermanencesUpdated++;
        resolve();
      }));
    });
    await Promise.all(promisePermanences);
    logger.info('Mise à jour des permanences effectuée (' + countPermanencesUpdated + ' / ' + countPermanences + ')');

  } catch (error) {
    logger.error(error);
    Sentry.captureException(error);
  }
  logger.info('Fin de la mise à jour des noms de commune en majuscule.');
  exit();
});
