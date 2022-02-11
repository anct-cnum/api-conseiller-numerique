#!/usr/bin/env node
'use strict';
const path = require('path');
const fs = require('fs');
const dayjs = require('dayjs');

const { execute } = require('../utils');

execute(__filename, async ({ logger, db }) => {
  const conseillers = await db.collection('conseillers').find({ statut: 'RECRUTE' }).toArray();
  logger.info(`Generating NDJSON file...`);

  const today = dayjs(new Date()).format('YYYY-MM-DD');
  let csvFile = path.join(__dirname, '../../../data/exports', `cnfs_sit_${today}.ndjson`);

  let file = fs.createWriteStream(csvFile, {
    flags: 'w'
  });
  file.write(conseillers.map(JSON.stringify).join('\n')); // ndjson
  logger.info(`${conseillers.length} conseiller(s) récruté(s)`);
  file.close();
});
