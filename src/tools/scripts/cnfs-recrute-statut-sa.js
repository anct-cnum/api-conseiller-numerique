#!/usr/bin/env node
'use strict';

const { execute } = require('../utils');
const utils = require('../../utils/index');

execute(__filename, async ({ logger, db, exit }) => {
  const conseillersRecrute = await db.collection('conseillers').distinct('structureId', { statut: 'RECRUTE' });
  let countError = 0;

  for (let idSA of conseillersRecrute) {
    const structure = await db.collection('structures').findOne({ _id: idSA });
    const countMiseEnrelation = await db.collection('misesEnRelation').countDocuments({
      'structure.$id': idSA,
      'statut': { $in: ['recrutee', 'finalisee'] },
    });
    const dernierCoselec = utils.getCoselec(structure);
    const verifSAStatut = structure?.statut !== 'VALIDATION_COSELEC';
    const verifQuotaSA = countMiseEnrelation > dernierCoselec.nombreConseillersCoselec;

    if (verifSAStatut || verifQuotaSA) {
      if (verifSAStatut) {
        logger.error(`La structure ${structure.nom} (id: ${structure.idPG}) à un statut "${structure.statut}" mais a pourtant au moins 1 conseiller SELECTIONNE || RECRUTE`);
      }
      if (verifQuotaSA) {
        logger.error(`La structure ${structure.idPG} a dépassé le quota (${countMiseEnrelation} misesEnRelation > ${dernierCoselec.nombreConseillersCoselec} poste(s) autorisé) `);
      }
      countError++;
    }
  }
  logger.info(`${countError} / ${conseillersRecrute.length} erreur(s) au total`);
  exit();
});
