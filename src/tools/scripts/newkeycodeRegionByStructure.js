#!/usr/bin/env node
'use strict';

const { execute } = require('../utils');

execute(__filename, async ({ logger, db }) => {
  const conseillers = await db.collection('conseillers').find({ 'statut': 'RECRUTE', 'codeRegionStructure': { $exists: false } }).toArray();
  let count = 0;
  let promises = [];
  logger.info('Mettre la clé "codeRegionStructure" à tous les conseillers recrutés...');
  conseillers.forEach(conseiller => {
    promises.push(new Promise(async resolve => {
      const structure = await db.collection('structures').findOne({ _id: conseiller.structureId });
      await db.collection('conseillers').updateOne({ _id: conseiller._id }, { $set: { 'codeRegionStructure': structure.codeRegion } });
      count++;
      resolve();
    }));
  });
  await Promise.all(promises);
  logger.info(`Tout les conseillers ont bien eut la nouvelle clé ( ${count} au total )`);
});

