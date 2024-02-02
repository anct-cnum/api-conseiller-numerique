#!/usr/bin/env node
'use strict';

const { execute } = require('../utils');
const dayjs = require('dayjs');

execute(__filename, async ({ logger, db, exit }) => {
  let countCorrection = 0;
  const promises = [];
  try {
    const conseillers = await db.collection('conseillers').find(
      { dateDeNaissance: { $type: 'string' } }
    ).toArray();
    logger.info(`${conseillers.length} conseillers à corriger`);
    conseillers.forEach(conseiller => {
      promises.push(new Promise(async resolve => {
        let query = { $unset: { dateDeNaissance: '' } };
        if (dayjs(conseiller.dateDeNaissance).isValid()) {
          query = { $set: { dateDeNaissance: new Date(conseiller.dateDeNaissance) } };
        }
        await db.collection('conseillers').updateOne(
          { _id: conseiller._id },
          query
        );
        countCorrection += 1;
        resolve();
      }));
    });
  } catch (e) {
    logger.error(e);
  }
  await Promise.all(promises);

  logger.info(`${countCorrection} conseillers corrigés`);
  exit();
});
