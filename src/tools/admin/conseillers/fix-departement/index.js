#!/usr/bin/env node
/* eslint-disable guard-for-in */
'use strict';

require('dotenv').config();

const { execute } = require('../../../utils');

execute(__filename, async ({ db, logger, exit }) => {

  logger.info('Recherche des conseillers sans département...');
  let count = 0;
  const conseillers = await db.collection('conseillers').find({ codeDepartement: '' }).toArray();
  for (const idx in conseillers) {
    const conseiller = conseillers[idx];
    const length = conseiller.codePostal.startsWith('97') ? 3 : 2;
    const codeDepartement = conseiller.codePostal.substring(0, length);
    const c = await db.collection('conseillers').findOne({ codeDepartement: codeDepartement, codeRegion: { $ne: '' } }, { codeRegion: 1 });
    if (c === null) {
      logger.info(`Région introuvable pour le département ${codeDepartement}`);
    } else {
      let { codeRegion } = c;
      await db.collection('conseillers').updateOne({ _id: conseiller._id }, { $set: { codeDepartement, codeRegion } });
      count++;
    }
  }
  logger.info(`${count} conseillers mises à jours`);

  exit();
});
