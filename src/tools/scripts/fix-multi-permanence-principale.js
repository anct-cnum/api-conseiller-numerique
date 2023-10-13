#!/usr/bin/env node
'use strict';
const { execute } = require('../utils');

// node src/tools/scripts/fix-multi-permanence-principale.js

execute(__filename, async ({ logger, db }) => {
  let promises = [];
  let correctifLieuPrincipal = 0;

  const conseillers = await db.collection('permanences').aggregate(
    [
      { $unwind: '$lieuPrincipalPour' },
      {
        $group: {
          '_id': '$lieuPrincipalPour',
          'countPerm': { $sum: 1 },
        }
      },
      { $match: { countPerm: { $ne: 1 } } }
    ]).toArray();

  logger.info(`Fix permanence principale en multiple...`);
  conseillers.forEach(conseiller => {
    promises.push(new Promise(async resolve => {
      if (conseiller.countPerm === 2) {
        await db.collection('permanences').updateOne(
          { lieuPrincipalPour: { $in: [conseiller._id] } },
          { $pull: { 'lieuPrincipalPour': conseiller._id }
          });
        correctifLieuPrincipal++;
      } else {
        logger.info(`Il y a ${conseiller.countPerm} permanences principales  pour le conseiller ${conseiller._id}`);
      }
      resolve();
    }));
  });
  await Promise.all(promises);

  logger.info(`Il y a ${correctifLieuPrincipal} conseiller(s) qui a(ont) été corrigé(s) / ${conseillers.length}`);
});
