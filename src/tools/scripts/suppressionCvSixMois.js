#!/usr/bin/env node
'use strict';
const dayjs = require('dayjs');

const { execute } = require('../utils');
const { suppressionCVConseiller, suppressionCv } = require('../../services/conseillers/conseillers.function');

execute(__filename, async ({ logger, db, app }) => {

  const date = new Date(dayjs(new Date()).subtract(6, 'month'));
  let cvSupprimes = 0;

  const conseillers = await db.collection('conseillers').find({ 'cv.date': { $lte: date } }).toArray();
  let promises = [];

  logger.info('Suppression des CVs de plus de 6 mois...');
  if (conseillers.length > 0) {
    conseillers.forEach(conseiller => {
      promises.push(new Promise(async resolve => {
        try {
          await suppressionCv(conseiller.cv, app, null, true);
          await suppressionCVConseiller(db, conseiller);
        } catch (error) {
          logger.error(error);
          app.get('sentry').captureException(error);
        }

        resolve();
      }));
      cvSupprimes++;
    });
  }

  logger.info('Suppression effectuée sur ' + cvSupprimes + ' CVs.');
  await Promise.all(promises);
});
