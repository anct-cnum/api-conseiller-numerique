#!/usr/bin/env node
'use strict';

const { execute } = require('../utils');

const getConseillersHistorique = async db => await db.collection('conseillers').find({
  'groupeCRAHistorique': { '$exists': true },
  '$expr': { '$gt': [{ '$size': '$groupeCRAHistorique' }, 3] }
}).toArray();

const updateGroupeCRAHistorique = db => async (idConseiller, groupeCraHistorique) => await db.collection('conseillers').updateOne(
  { '_id': idConseiller },
  { '$set': { 'groupeCRAHistorique': groupeCraHistorique } }
);

execute(__filename, async ({ logger, db }) => {
  const promises = [];
  let erreurCount = 0;
  let succesCount = 0;
  logger.info('Début du script de nettoyage des groupesCRAHistorique pour ne garder que les 3 derniers');
  const conseillersHistoriqueCra = await getConseillersHistorique(db);
  conseillersHistoriqueCra.forEach(conseiller => {
    promises.push(new Promise(async resolve => {
      if (conseiller.groupeCRAHistorique.length > 3) {
        logger.info('Réduction de l\'historique CRA du conseiller (idPG) ' + conseiller.idPG);
        try {
          await updateGroupeCRAHistorique(db)(conseiller._id, conseiller.groupeCRAHistorique.slice(-3)).then(() => {
            logger.info('Historique CRA du conseiller (idPG) ' + conseiller.idPG + ' réduit avec succès');
            succesCount++;
          });
        } catch (error) {
          logger.error('Erreur lors de la réduction de l\'historique CRA du conseiller (idPG) ' + conseiller.idPG);
          logger.error(error);
          erreurCount++;
        }
      }
      resolve();
    }));
  });

  await Promise.all(promises);

  logger.info('Nombre d\'historique CRA des conseillers réduit ' + succesCount);
  logger.info('Nombre d\'historique CRA des conseillers qui n\'ont pas été réduit ' + erreurCount);
  logger.info('Fin du script de nettoyage des groupesCRAHistorique pour ne garder que les 3 derniers');
});
