#!/usr/bin/env node
'use strict';

require('dotenv').config();

const { execute } = require('../utils');

const getPermanencesDoublon = async db => db.collection('permanences').aggregate([
  { $group: {
    '_id': '$location',
    'location': { $first: '$location' },
    'count': { $sum: 1 } }
  },
  { $match: { 'count': { $gt: 1 } } },
  { $project:{ 'location': 1, '_id': 0 } },
  { $group: { '_id': null, 'duplicateLocation': { $push: '$location.coordinates' } } },
  { $project: {'_id': 0, 'duplicateLocation': 1 } }
]).toArray();
execute(__filename, async ({ db, logger, exit }) => {
  logger.info('Correction des permanences en doublon');

  let promises = [];
  let countCorrection = 0;

  const permanences = await getPermanencesDoublon(db);
  permanences.forEach(location => {
    console.log(location);
  });
  console.log(permanences);
  await Promise.all(promises);

  logger.info(`${countCorrection} permanences ont été corrigées !`);
  exit();
});
