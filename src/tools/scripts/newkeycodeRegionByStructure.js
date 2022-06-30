#!/usr/bin/env node
'use strict';

const { execute } = require('../utils');

execute(__filename, async ({ logger, db }) => {
  const conseillers = await db.collection('conseillers').find({ 'statut': 'RECRUTE', 'codeRegionBystructure': { '$exists': false } }).toArray();
  console.log('conseillers:', conseillers[0]._id);
  let count = 0;
  let promises = [];
  logger.info('Mettre la clé "codeRegionBystructure" à tous les conseillers recruté...');
  conseillers.forEach(conseiller => {
    promises.push(new Promise(async resolve => {
      const structure = await db.collection('structures').findOne({ _id: conseiller.structureId });
      await db.collection('conseillers').updateOne({ _id: conseiller._id }, { $set: { 'codeRegionBystructure': structure.codeRegion } });
      count++;
      resolve();
    }));
  });
  await Promise.all(promises);
  logger.info(`Tout les conseillers ont bien eut la nouvelle clé ( ${count} au total )`);
});

