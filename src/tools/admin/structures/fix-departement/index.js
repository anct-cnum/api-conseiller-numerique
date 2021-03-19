#!/usr/bin/env node
/* eslint-disable guard-for-in */
'use strict';

require('dotenv').config();

const { execute } = require('../../../utils');

execute(async ({ db, logger, exit }) => {

  logger.info('Recherche des structures sans département...');
  let count = 0;
  const structures = await db.collection('structures').find({ codeDepartement: '' }).toArray();
  for (const idx in structures) {
    const structure = structures[idx];
    const length = structure.codePostal.startsWith('97') ? 3 : 2;
    const codeDepartement = structure.codePostal.substring(0, length);
    const struct = await db.collection('structures').findOne({ codeDepartement: codeDepartement, codeRegion: { $ne: '' } }, { codeRegion: 1 });
    if (struct === null) {
      logger.info(`Région introuvable pour le département ${codeDepartement}`);
    } else {
      let { codeRegion } = struct;
      await db.collection('structures').updateOne({ _id: structure._id }, { $set: { codeDepartement, codeRegion } });
      count++;
    }
  }
  logger.info(`${count} structures mises à jours`);

  exit();
});
