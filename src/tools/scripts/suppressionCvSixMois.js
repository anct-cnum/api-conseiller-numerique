#!/usr/bin/env node
'use strict';
const dayjs = require('dayjs');

const { execute } = require('../utils');
const { suppressionCVConseiller, suppressionCv } = require('../../services/conseillers/conseillers.function');

execute(__filename, async ({ logger, db, app }) => {

  const DATE = new Date(dayjs(new Date()).subtract(6, 'month'));
  let cvSupprimes = 0;

  const conseillers = await db.collection('conseillers').find({ 'cv.date': { $lte: DATE } }).toArray();
  let promises = [];

  const onError = async error => {
    logger.error(error);
    app.get('sentry').captureException(error);
  };

  logger.info('Suppression des CVs de plus de 6 mois...');

  if (conseillers.length > 0) {
    conseillers.forEach(conseiller => {
      promises.push(new Promise(async resolve => {
        await db.collection('conseillers').updateOne({ _id: conseiller._id }, { $set: { 'cv.suppressionEnCours': true } });
        await suppressionCv(conseiller.cv, app)
        .then(async () => {
          return suppressionCVConseiller(db, conseiller);
        }).then(() => {
          cvSupprimes++;
        }).catch(onError);
        resolve();
      }));
    });
  }

  await Promise.all(promises);
  logger.info('Suppression effectuée sur ' + cvSupprimes + ' CVs.');
});
