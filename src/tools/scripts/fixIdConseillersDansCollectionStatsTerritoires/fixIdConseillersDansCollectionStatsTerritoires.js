#!/usr/bin/env node
'use strict';
const { execute } = require('../../utils');

const getTerritoires = async db => await db.collection('stats_Territoires').find().toArray();

const getConseillerRecrute = async (db, id) => await db.collection('conseillers').findOne({ '_id': id, 'statut': 'RECRUTE' });

const getConseillerIdCorrect = async (db, id) => {
  const doublon = await db.collection('conseillers').findOne({ '_id': id });
  const conseiller = await db.collection('conseillers').findOne({ 'email': doublon.email, 'statut': 'RECRUTE' });
  return conseiller._id;
};

const updateTerritoire = async (db, id, list) => {
  await db.collection('stats_Territoires').updateOne({ '_id': id }, {
    $set: {
      conseillerIds: list,
    }
  });
};
execute(__filename, async ({ db, logger, Sentry, exit }) => {
  logger.info('Script de correction des Ids conseillers en doublon par territoires');

  const territoires = await getTerritoires(db);

  try {
    territoires.forEach(async territoire => {
      let promises = [];
      if (territoire.conseillerIds.length > 0) {
        let nouvelleListeConseillerIds = [];
        territoire.conseillerIds.forEach(id => {

          promises.push(new Promise(async resolve => {
            const conseillerRecrute = await getConseillerRecrute(db, id);
            if (conseillerRecrute === null) {
              const conseillerId = await getConseillerIdCorrect(db, id);
              nouvelleListeConseillerIds.push(conseillerId);
            } else {
              nouvelleListeConseillerIds.push(id);
            }
            resolve();
          }));
        });

        await Promise.all(promises);

        await updateTerritoire(db, territoire._id, nouvelleListeConseillerIds);
      }
    });

  } catch (error) {
    logger.error(error);
    Sentry.captureException(error);
  }

  exit();
});
