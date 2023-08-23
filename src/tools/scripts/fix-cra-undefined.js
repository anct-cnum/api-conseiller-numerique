#!/usr/bin/env node
'use strict';

const { execute } = require('../utils');

// node src/tools/scripts/fix-cra-undefined.js

execute(__filename, async ({ logger, db }) => {
  const cras = await db.collection('cras').find({ 'cra.nomCommune': 'NED UNDEFINED' }).toArray();
  let promises = [];

  logger.info(`Correction des ${cras.length} cras (NED UNDEFINED)...`);
  cras.forEach(cra => {
    promises.push(new Promise(async resolve => {
      let dateAccompagnementDebut = new Date(cra.cra.dateAccompagnement);
      let dateAccompagnementFin = new Date(cra.cra.dateAccompagnement);

      dateAccompagnementDebut.setUTCHours(0, 0, 0, 0);
      dateAccompagnementFin.setUTCHours(23, 59, 59, 59);
      const query = {
        'conseiller.$id': cra.conseiller.oid,
        'cra.nomCommune': { '$ne': 'NED UNDEFINED' },
        'cra.dateAccompagnement': {
          '$gte': dateAccompagnementDebut,
          '$lte': dateAccompagnementFin,
        },
        'cra.canal': cra.cra.canal
      };
      const crasDay = await db.collection('cras').distinct('cra.nomCommune', query);

      if (crasDay.length >= 2) {
        logger.info(`Le cra: ${cra?._id} (canal: ${cra.cra.canal}) peut matcher avec plusieurs nomCommune : ${crasDay}`);
      } else if (crasDay.length === 1) {
        const resultCra = await db.collection('cras').findOne(query);
        await db.collection('cras').updateOne({ '_id': cra._id }, { $set: {
          'cra.codePostal': resultCra.cra.codePostal,
          'cra.nomCommune': resultCra.cra.nomCommune,
          'cra.codeCommune': resultCra.cra.codeCommune,
        }
        });
        logger.info(`Le cra: ${cra._id} update => ${resultCra?.cra?.codePostal} ${resultCra?.cra?.nomCommune} (${resultCra?.cra?.codeCommune})`);
      } else {
        logger.info(`Le cra: ${cra._id} (canal: ${cra.cra.canal}) ne match avec aucun autre cra du meme jour (${cra.cra.dateAccompagnement})`);
      }
      resolve();
    }));
  });
  await Promise.all(promises);
});
