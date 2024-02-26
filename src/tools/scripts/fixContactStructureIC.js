#!/usr/bin/env node
'use strict';

require('dotenv').config();

const { execute } = require('../utils');
const { v4: uuidv4 } = require('uuid');

execute(__filename, async ({ db, logger, exit }) => {
  logger.info('Reset sub IC des contacts structure...');
  let promises = [];
  const structures = await db.collection('structures').aggregate([
    {
      $match: {
        'historique.date': { $gte: new Date('2023-07-10') },
        'statut': 'VALIDATION_COSELEC'
      }
    },
    {
      $project: {
        idPG: 1,
        historique: {
          $filter: {
            input: '$historique',
            as: 'historique',
            cond: {
              $and: [
                { $gte: ['$$historique.date', new Date('2023-07-10')] },
                { $eq: ['$$historique.changement', 'email'] }
              ]
            }
          }
        }
      }
    },
    {
      $match: {
        historique: { $not: { $size: 0 } }
      }
    },
  ]).toArray();

  structures.forEach(async structure => {
    promises.push(new Promise(async resolve => {
      const listContact = structure.historique.map(i => i.data.nouveauEmail);
      const result = await db.collection('users').updateMany(
        { 'name': { $in: listContact }, 'entity.$id': structure._id },
        {
          $set: {
            token: uuidv4(),
            tokenCreatedAt: new Date(),
          },
          $unset: {
            refreshToken: '',
            lastLogin: '',
            sub: '',
          }
        }
      );
      logger.info(`- Structure id: ${structure.idPG} : ${listContact.length} changements contact (${listContact}) => ${result.modifiedCount} reset confirmé`);
      resolve();
    }));
  });
  await Promise.all(promises);
  logger.info(`${structures.length} contact structures mis à jour`);
  exit();
});
