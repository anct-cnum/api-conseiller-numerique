#!/usr/bin/env node
'use strict';

require('dotenv').config();

const { execute } = require('../../utils');

execute(__filename, async ({ db, logger, exit, Sentry }) => {
  logger.info('Rattrapage en string du numeroDepartement collection Metabase stats_PostesValidesDepartement');

  let promises = [];

  try {
    await db.collection('stats_PostesValidesDepartement').find().forEach(async stat => {
      promises.push(new Promise(async resolve => {
        logger.info('Mise à jour collection stats_PostesValidesDepartement date : ' + stat.date);
        stat.data.forEach(dataDep => {
          let updDep = String(dataDep.numeroDepartement);
          db.collection('stats_PostesValidesDepartement').updateOne(
            { '_id': stat._id, 'data.numeroDepartement': dataDep.numeroDepartement },
            { $set: { 'data.$.numeroDepartement': updDep } });
        }
        );
        resolve();
      }));
    });

    await Promise.all(promises);
    logger.info(`Fin rattrapage en string du numeroDepartement collection Metabase stats_PostesValidesDepartement`);
    exit();
  } catch (error) {
    logger.error(error.message);
    Sentry.captureException(error);
  }
});
