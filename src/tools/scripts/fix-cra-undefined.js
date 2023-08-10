#!/usr/bin/env node
'use strict';

const { execute } = require('../utils');

execute(__filename, async ({ logger, db }) => {
  const cras = await db.collection('cras').find({ 'cra.nomCommune': 'NED UNDEFINED' }).toArray();
  let promises = [];

  logger.info(`Correction des ${cras.length} cras (NED UNDEFINED)...`);
  cras.forEach(cra => {
    promises.push(new Promise(async resolve => {
      let dateAccompagnementDebut = cra.cra.dateAccompagnement;
      let dateAccompagnementFin = cra.cra.dateAccompagnement;

      dateAccompagnementDebut.setUTCHours(0, 0, 0, 0);
      dateAccompagnementFin.setUTCHours(23, 59, 59, 59);

      const crasDay = await db.collection('cras').distinct('cra.nomCommune', { 'conseiller.$id': cra.conseiller.oid, 'cra.dateAccompagnement': {
        '$gte': dateAccompagnementDebut,
        '$lte': dateAccompagnementFin,
      } });

      if (crasDay >= 2) {
        logger.info(`Le cra: ${cra._id} peut matcher avec plusieurs nomCommune : ${crasDay}`);
      } else if (cras.length === 1) {
        const resultCra = await db.collection('cras').findOne({ 'conseiller.$id': cra.conseiller.oid, 'cra.dateAccompagnement': {
          '$gte': dateAccompagnementDebut,
          '$lte': dateAccompagnementFin,
        } });
        await db.collection('cras').updateOne({ '_id': cra._id },
          { $set: {
            'cra.codePostal': resultCra.cra.codePostal,
            'cra.nomCommune': resultCra.cra.nomCommune,
            'cra.codeCommune': resultCra.cra.codeCommune,
          } });
        logger.info(`Le cra: ${cra._id} update => ${resultCra.cra.codePostal} ${resultCra.cra.nomCommune} (${resultCra.cra.codeCommune})`);
      } else {
        logger.info(`Le cra: ${cra._id}`);
      }

      resolve();
    }));
  });
  await Promise.all(promises);
});
