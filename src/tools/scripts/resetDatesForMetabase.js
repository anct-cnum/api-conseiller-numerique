#!/usr/bin/env node
'use strict';

require('dotenv').config();

const { execute } = require('../utils');

execute(__filename, async ({ db, logger, exit }) => {
  logger.info('RAZ heures, minutes, secondes des dates pour les collections Metabase');

  let promises = [];
  await db.collection('stats_PostesValidesDepartement').find().forEach(async stat => {
    promises.push(new Promise(async resolve => {
      let updDate = stat.date.setUTCHours(0, 0, 0, 0);
      await db.collection('stats_PostesValidesDepartement').updateOne({ _id: stat._id }, { $set: { date: new Date(updDate) } });
      resolve();
    }));
  });

  await db.collection('stats_PostesValidesStructure').find().forEach(async stat => {
    promises.push(new Promise(async resolve => {
      let updDate = stat.date.setUTCHours(0, 0, 0, 0);
      await db.collection('stats_PostesValidesStructure').updateOne({ _id: stat._id }, { $set: { date: new Date(updDate) } });
      resolve();
    }));
  });

  await db.collection('stats_ConseillersRecrutesDepartement').find().forEach(async stat => {
    promises.push(new Promise(async resolve => {
      let updDate = stat.date.setUTCHours(0, 0, 0, 0);
      await db.collection('stats_ConseillersRecrutesDepartement').updateOne({ _id: stat._id }, { $set: { date: new Date(updDate) } });
      resolve();
    }));
  });

  await db.collection('stats_ConseillersRecrutesStructure').find().forEach(async stat => {
    promises.push(new Promise(async resolve => {
      let updDate = stat.date.setUTCHours(0, 0, 0, 0);
      await db.collection('stats_ConseillersRecrutesStructure').updateOne({ _id: stat._id }, { $set: { date: new Date(updDate) } });
      resolve();
    }));
  });

  await db.collection('stats_Candidats').find().forEach(async stat => {
    promises.push(new Promise(async resolve => {
      let updDate = stat.date.setUTCHours(0, 0, 0, 0);
      await db.collection('stats_Candidats').updateOne({ _id: stat._id }, { $set: { date: new Date(updDate) } });
      resolve();
    }));
  });

  await db.collection('stats_StructuresCandidates').find().forEach(async stat => {
    promises.push(new Promise(async resolve => {
      let updDate = stat.date.setUTCHours(0, 0, 0, 0);
      await db.collection('stats_StructuresCandidates').updateOne({ _id: stat._id }, { $set: { date: new Date(updDate) } });
      resolve();
    }));
  });

  await Promise.all(promises);
  logger.info(`Fin RAZ heures, minutes, secondes des dates pour les collections metabase`);
  exit();
});
