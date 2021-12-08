#!/usr/bin/env node
/* eslint-disable guard-for-in */
'use strict';

require('dotenv').config();

const { execute } = require('../utils');
const { getLastCoselec } = require('../../utils');
const mappingAvisStatut = new Map([
  ['EXAMEN COMPLÉMENTAIRE', 'EXAMEN_COMPLEMENTAIRE_COSELEC'],
  ['NÉGATIF', 'REFUS_COSELEC']
]);

/*
 * Dans certains cas, le dernier Coselec a un avis null
 * C'est dû à des lignes erronées dans certains fichiers PV Coselec
 * Pour le moment on ne les traite pas
 * */

execute(__filename, async ({ db, logger, exit }) => {
  logger.info('Recherche les structures non validées en Coselec');
  let count = 0;
  // Uniquement les SA avec le statut CREEE
  // On liste explicitement les autres statuts
  // pour être sûr de ne pas écraser un statut
  // mis directement en base ou par un autre script
  const structures = await db.collection('structures').find({
    $and: [
      { statut: { $ne: 'VALIDATION_COSELEC' } },
      { statut: { $ne: 'EXAMEN_COMPLEMENTAIRE_COSELEC' } },
      { statut: { $ne: 'REFUS_COSELEC' } },
      { statut: { $ne: 'ABANDON' } },
      { statut: { $ne: 'ANNULEE' } },
      { statut: { $ne: 'DOUBLON' } },
      { statut: { $ne: 'NEGATIF' } },
    ]
  }).toArray();

  for (const idx in structures) {
    const structure = structures[idx];
    logger.info(`${structure.idPG} ${structure.nom}`);
    const coselec = getLastCoselec(structure);

    if (coselec !== null && ['EXAMEN COMPLÉMENTAIRE', 'NÉGATIF'].includes(coselec.avisCoselec)) {
      await db.collection('structures').updateOne({ _id: structure._id }, { $set: { statut: mappingAvisStatut.get(coselec.avisCoselec) } }, {});
      count++;
      logger.info(`AVIS : ${coselec.avisCoselec}`);
    }
  }
  logger.info(`${count} structures mises à jour`);

  exit();
});
