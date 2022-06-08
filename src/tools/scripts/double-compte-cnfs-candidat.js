#!/usr/bin/env node
'use strict';

require('dotenv').config();

const { execute } = require('../utils');

execute(__filename, async ({ db, logger, exit }) => {
  logger.info('COUNT DOUBLE COMPTE');
  let count = 0;
  let countRecrute = 0;
  let promises = [];
  await db.collection('conseillers').find({ statut: 'RECRUTE' }).forEach(async conseiller => {
    promises.push(new Promise(async resolve => {
      const user = await db.collection('users').countDocuments({
        'name': conseiller.email,
        'entity.$id': { '$ne': conseiller._id }
      });
      if (user !== 0) {
        console.log('conseiller.emai:', conseiller.email, user);
        count++;
      }
      countRecrute++;
      resolve();
    }));
  });
  await Promise.all(promises);
  logger.info(`${count} conseiller(s) recruté a un compte candidat avec le même email perso sur ${countRecrute} au total`);
  exit();
});
