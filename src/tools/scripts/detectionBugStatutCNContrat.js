#!/usr/bin/env node
'use strict';
require('dotenv').config();

const { execute } = require('../utils');

// node src/tools/scripts/detectionBugStatutCNContrat.js

execute(__filename, async ({ db, logger, exit }) => {

  logger.info(`Détection en cours...`);
  let countOk = 0;
  const conseillers = await db.collection('conseillers').find({ 'statut': { '$exists': true } }).toArray();
  for (const conum of conseillers) {
    const contrats = await db.collection('misesEnRelation').find({
      'conseiller.$id': conum._id,
      'statut': { '$in': ['finalisee_rupture', 'terminee', 'renouvellement_initiee', 'nouvelle_rupture', 'finalisee']
      }
    }).toArray();
    const finalisee = contrats.filter(i => i.statut === 'finalisee');
    const terminee = contrats.filter(i => i.statut === 'terminee');
    const renouvellementInitiee = contrats.filter(i => i.statut === 'renouvellement_initiee');
    const nouvelleRupture = contrats.filter(i => i.statut === 'nouvelle_rupture');
    const finaliseeRupture = contrats.filter(i => i.statut === 'finalisee_rupture');

    if (conum?.statut === 'RECRUTE' && (finalisee.length === 0 && nouvelleRupture.length === 0)) {
      logger.error(`Conseiller RECRUTE mais sans contrat id: ${conum.idPG} (id: ${conum._id})`);
    } else if (terminee[0]?.dateRupture) {
      logger.error(`Conseiller id: ${conum.idPG} a un terminee avec des infos de ruptures (id: ${conum._id})`);
    // eslint-disable-next-line max-len
    } else if (renouvellementInitiee.length === 1 && (nouvelleRupture.length === 1 || finaliseeRupture.find(i => String(i.structure.oid) === String(renouvellementInitiee[0]?.structure.oid)))) {
      logger.error(`Conseiller id: ${conum.idPG} a un contrat en rupture avec en parallèle un renouvellement en cours (id: ${conum._id})`);
    } else {
      countOk++;
    }
  }
  logger.info(`${conseillers.length - countOk}/${conseillers.length} conseillers ont un problème dans les misesEnRelations`);
  exit();
});
