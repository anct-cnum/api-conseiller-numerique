#!/usr/bin/env node
'use strict';

const { execute } = require('../utils');

execute(__filename, async ({ logger, db }) => {
  const conseillers = await db.collection('conseillers').find({ ruptures: { $exists: true } }).toArray();
  let promises = [];

  logger.info('Suppression des conseillers liés à des permanences avec le statut RUPTURE...');
  conseillers.forEach(conseiller => {
    promises.push(new Promise(async resolve => {
      await db.collection('permanences').updateMany(
        {
          $or: [
            { 'structure.oid': { $ne: conseiller.structureId } },
            { 'conseillers': { $elemMatch: { $eq: conseiller._id } } },
            { 'conseillersItinerants': { $elemMatch: { $eq: conseiller._id } } }
          ]
        },
        { $pull: { conseillers: conseiller._id, conseillersItinerants: conseiller._id } }
      );
      resolve();
    }));
  });
  await Promise.all(promises);
});
