#!/usr/bin/env node
'use strict';

const { execute } = require('../../utils');
const { ObjectId } = require('mongodb');
const { getPermanencesDoublons } = require('./fix_doublons_functions.utils');

const getCrasConseillerPermanence = db => async (idConseillers, idPermanence) => await db.collection('cras').find({
  'conseiller.$id': { '$in': idConseillers },
  'permanence.$id': new ObjectId(idPermanence),
}).limit(20).toArray();

const insertCras = db => async cras => {
  cras.forEach(async cra => {
    await db.collection('cras_test').replaceOne({ '_id': cra._id }, cra, { upsert: true });
  });
};

execute(__filename, async ({ logger, db }) => {
  logger.info('Etape 0 :');
  logger.info('Création de la collection de test pour les cras');
  const promises = [];
  const datas = await getPermanencesDoublons(db);
  datas.forEach(data => {
    promises.push(new Promise(async resolve => {
      for (let i = 0; i < data.permanences.length; i++) {
        if (i > 0) {
          const conseillers = data.permanences[i].conseillers;
          const conseillersIds = [];
          for (let y = 0; y < conseillers.length; y++) {
            if (!conseillersIds.find(conseiller => String(conseiller) === String(conseillers[y]))) {
              conseillersIds.push(conseillers[y]);
            }
          }
          await getCrasConseillerPermanence(db)(conseillersIds, data.permanences[0]._id).then(async cras => {
            await insertCras(db)(cras);
          });
        }
      }
      resolve();
    }));
  });

  await Promise.all(promises);

  logger.info('Fin de la création de la collection de test pour les cras');
});
