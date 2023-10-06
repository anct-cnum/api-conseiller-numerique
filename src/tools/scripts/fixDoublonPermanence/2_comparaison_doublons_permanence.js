#!/usr/bin/env node
'use strict';

const { execute } = require('../../utils');
const { getPermanencesDoublons, createCsvFile } = require('./fix_doublons_functions.utils');

const permanenceExists = db => async idPermanence => {
  const permTemp = await db.collection('permanences_temp').findOne({ '_id': idPermanence });
  const perm = await db.collection('permanences_test').findOne({ '_id': idPermanence });

  return (
    String(permTemp?.adresse) === String(perm?.adresse) &&
    String(permTemp?.location) === String(perm?.location) &&
    String(permTemp?.structure) === String(perm?.structure)
  );
};

execute(__filename, async ({ logger, db }) => {
  logger.info('Comparaison de la collection permanences avec permanences_temp');

  const promises = [];
  const permanencesErreur = [];

  const datas = await getPermanencesDoublons(db);
  datas.forEach(data => {
    data.permanences.forEach(permanence => {
      promises.push(new Promise(async resolve => {
        const permExists = await permanenceExists(db)(permanence._id);
        if (!permExists) {
          permanencesErreur.push(permanence._id);
        }
        resolve();
      }));
    });
  });
  await Promise.all(promises);
  logger.info('Création du fichier d\'erreur');
  const csvHeader = 'Id permanence en erreur;';
  createCsvFile('Permanences_comparees_en_erreur', csvHeader, 'erreurComparaison', permanencesErreur);

  logger.info('Fin de la comparaison des collections permanences et permanences_temp');
});
