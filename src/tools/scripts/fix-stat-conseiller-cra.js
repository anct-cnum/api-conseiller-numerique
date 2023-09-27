#!/usr/bin/env node
'use strict';

const { execute } = require('../utils');
const { DBRef, ObjectId } = require('mongodb');

execute(__filename, async ({ logger, db, app }) => {

  const connection = app.get('mongodb');
  const database = connection.substr(connection.lastIndexOf('/') + 1);

  // prendre unqiuement les cras d'hier,
  // Le cron actuelle passera pour les cras créée aujourd'hui
  let dateFinCra = new Date();
  dateFinCra.setDate(dateFinCra.getDate() - 1);
  dateFinCra.setUTCHours(23, 59, 59, 59);

  const conseillersId = await db.collection('cras').distinct('conseiller.$id',
    { 'createdAt': { '$lte': dateFinCra } });

  let promises = [];
  let count = 0;

  logger.info(`Recalcul stat cras des ${conseillersId.length} conseillers...`);
  conseillersId.forEach(conseillerId => {
    promises.push(new Promise(async resolve => {
      let stat = await db.collection('cras').aggregate(
        [
          { $match: { 'createdAt': { '$lte': dateFinCra } } },
          {
            $group: {
              '_id': {
                mois: { $month: '$cra.dateAccompagnement' },
                annee: { $year: '$cra.dateAccompagnement' }
              },
              'countCras': { $sum: 1 },
            }
          },
          { $project: { mois: '$_id.mois', annee: '$_id.annee', totalCras: '$countCras', _id: 0 } },
          { $sort: { annee: 1, mois: 1 } },
          { $group: { '_id': '$annee', 'annee': { $push: { mois: '$mois', totalCras: '$totalCras' } } } },
          { $group: { '_id': null, 'data': { '$push': { 'k': { $toString: '$_id' }, 'v': '$annee' } } } },
          { $replaceRoot: { newRoot: { '$arrayToObject': '$data' } } },
        ]).toArray();

      let objectConseillerStat = {
        conseiller: new DBRef('conseillers', new ObjectId(conseillerId), database),
        ...stat[0]
      };
      await db.collection('rectif_stats_conseillers_cras').insertOne(objectConseillerStat);
      count++;
      resolve();
    }));
  });
  await Promise.all(promises);
  logger.info(`${count} conseiller(s) / ${conseillersId.length} OK`);
});
