#!/usr/bin/env node
'use strict';

const { execute } = require('../utils');

execute(__filename, async ({ logger, db, exit }) => {
  const conseillersRecrute =
  await db.collection('conseillers').distinct('structureId', { statut: 'RECRUTE' });
  let countError = 0;

  for (let idSA of conseillersRecrute) {
    const structure = await db.collection('structures').findOne({ _id: idSA });
    if (structure?.statut !== 'VALIDATION_COSELEC') {
      logger.error(`La structure ${structure.nom} (id: ${structure.idPG}) à un statut "${structure.statut}" et à au moins 1 conseiller RECRUTE`);
      countError++;
    }
  }
  logger.info(`${countError} / ${conseillersRecrute.length} erreur(s) aux total`);
  exit();
});
