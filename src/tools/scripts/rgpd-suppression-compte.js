#!/usr/bin/env node
'use strict';
require('dotenv').config();

const { execute } = require('../utils');
const {
  archiverLaSuppression,
  suppressionTotalCandidat,
  suppressionCv,
  candidatSupprimeEmailPix,
  deleteMailSib
} = require('../../services/conseillers/conseillers.function');

const getCandidatsInactifs = db => async query =>
  await db.collection('conseillers').find(query).toArray();

execute(__filename, async ({ app, logger, db, Sentry }) => {

  const promises = [];
  const queryCandidatInactif = { inactivite: true };
  const candidatsInactifs = await getCandidatsInactifs(db)(queryCandidatInactif);

  try {
    await archiverLaSuppression(app)(candidatsInactifs, null, 'suppression automatique du candidat (RGPD)', 'script').then(async () => {
      return await suppressionTotalCandidat(app)(candidatsInactifs);
    }).then(async () => {
      candidatsInactifs?.forEach(candidatInactif => {
        promises.push(new Promise(async resolve => {
          try {
            if (candidatInactif.cv) {
              await suppressionCv(candidatInactif.cv, app);
            }
            await candidatSupprimeEmailPix(db, app)(candidatInactif);
            await deleteMailSib(app)(candidatInactif.email);
          } catch (error) {
            logger.error(error);
            Sentry.captureException(error);
          }
          resolve();
        }));
      });
      Promise.all(promises);
    });
  } catch (error) {
    logger.info(error);
    Sentry.captureException(error);
  }

});
