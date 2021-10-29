#!/usr/bin/env node
'use strict';
const dayjs = require('dayjs');
const aws = require('aws-sdk');

const { execute } = require('../utils');
const { suppressionCVConseiller } = require('../../services/conseillers/conseillers.function');

execute(__filename, async ({ logger, db, app }) => {

  const date = new Date(dayjs(new Date()).subtract(6, 'month'));
  let cvSupprimes = 0;

  const conseillers = await db.collection('conseillers').find({ 'cv.date': { $lte: date } }).toArray();
  let promises = [];

  const suppressionAwsCv = async (cv, app) => {
    let promise;
    promise = new Promise(async resolve => {
      try {
        //initialisation AWS
        const awsConfig = app.get('aws');
        aws.config.update({ accessKeyId: awsConfig.access_key_id, secretAccessKey: awsConfig.secret_access_key });
        const ep = new aws.Endpoint(awsConfig.endpoint);
        const s3 = new aws.S3({ endpoint: ep });

        //Suppression du fichier CV
        let paramsDelete = { Bucket: awsConfig.cv_bucket, Key: cv?.file };
        s3.deleteObject(paramsDelete, function(error) {
          if (error) {
            logger.error(error);
            app.get('sentry').captureException(error);
          }
        });
        resolve();
      } catch (error) {
        logger.error(error);
        app.get('sentry').captureException(error);
      }
    });
    await promise;
  };

  logger.info('Suppression des CVs de plus de 6 mois...');
  if (conseillers.length > 0) {
    conseillers.forEach(conseiller => {
      promises.push(new Promise(async resolve => {
        cvSupprimes++;
        await suppressionAwsCv(conseiller.cv, app);
        try {
          await suppressionCVConseiller(db, conseiller);
        } catch (error) {
          logger.error(error);
          app.get('sentry').captureException(error);
        }

        resolve();
      }));
    });
  }

  logger.info('Suppression effectuée sur ' + cvSupprimes + ' CV.');
  await Promise.all(promises);
});
