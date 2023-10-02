#!/usr/bin/env node
'use strict';

const { execute } = require('../utils');
const { DBRef, ObjectId } = require('mongodb');

// node src/tools/scripts/fix-stat-conseiller-cra.js

execute(__filename, async ({ logger, db, app, exit }) => {

  const connection = app.get('mongodb');
  const database = connection.substr(connection.lastIndexOf('/') + 1);
  const listMois = Array.from({ length: 12 }, (e, i) => {
    return new Date(null, i + 1, null).toLocaleDateString('fr', { month: 'long' });
  });

  // prendre unqiuement les cras d'hier,
  // Le cron actuelle passera pour les cras créée aujourd'hui
  let dateFinCra = new Date();
  dateFinCra.setDate(dateFinCra.getDate() - 1);
  dateFinCra.setUTCHours(23, 59, 59, 59);

  const conseillersId = await db.collection('cras').distinct('conseiller.$id',
    { 'createdAt': { '$lte': dateFinCra } });

  let promises = [];
  let count = 0;
  const existsRectifCras = await db.collection('rectif_stats_cn_cras').countDocuments();

  if (existsRectifCras >= 1) {
    exit(`Veuillez supprimer la collection 'rectif_stats_cn_cras' qui contient ${existsRectifCras} docs puis relancer le script..`);
    return;
  }

  logger.info(`Recalcul stat cras des ${conseillersId.length} conseillers...`);
  conseillersId.forEach(conseillerId => {
    promises.push(new Promise(async resolve => {
      let stat = await db.collection('cras').aggregate(
        [
          { $match: { 'createdAt': { '$lte': dateFinCra }, 'conseiller.$id': conseillerId } },
          {
            $group: {
              '_id': {
                mois: { $month: '$cra.dateAccompagnement' },
                annee: { $year: '$cra.dateAccompagnement' }
              },
              'countCras': { $sum: 1 },
            }
          },
          { $project: { _id: 0, mois: '$_id.mois', annee: '$_id.annee', totalCras: '$countCras' } },
          { $sort: { annee: 1, mois: 1 } },
          { $group: { '_id': '$annee', 'annee': { $push: { mois: '$mois', totalCras: '$totalCras' } } } },
          { $group: { '_id': null, 'data': { '$push': { 'k': { $toString: '$_id' }, 'v': '$annee' } } } },
          { $replaceRoot: { newRoot: { '$arrayToObject': '$data' } } },
        ]).toArray();

      const addIndication = Object.keys(stat[0]).map(i => {
        return {
          [i]: stat[0][i].map(s => ({ ...s, mois: s.mois - 1, indication: listMois[s.mois - 1] }))
        };
      });

      let objectConseillerStat = {
        conseiller: new DBRef('conseillers', new ObjectId(conseillerId), database),
        ...addIndication.reduce((obj, value) => Object.assign(obj, value))
      };
      await db.collection('rectif_stats_cn_cras').insertOne(objectConseillerStat);
      count++;
      resolve();
    }));
  });
  await Promise.all(promises);
  logger.info(`${count} conseiller(s) / ${conseillersId.length} OK`);
});
