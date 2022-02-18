#!/usr/bin/env node
'use strict';

// require('dotenv').config();

// const { execute } = require('../utils');

// const { ObjectID } = require('mongodb');

// execute(__filename, async ({ db, logger, exit, Sentry }) => {
//   logger.info('Correction des dates de naissances sur les mises en relations...');

//   let promises = [];

//   const date = date => dayjs(date, 'YYYY-MM-DD').toDate();

//   console.log('111111111', date('2000-01-01T00:00:00Z'));
//   console.log('22222222222222', date('1920-01-01T00:00:00Z'));
//   const ok = await db.collection('misesEnRelation').find(
//     { 'conseillerObj.dateDeNaissance':
//         { $lte: date('1920-01-01T00:00:00Z'), $gte: date('2000-01-01T00:00:00Z') }
//     }
//   );
//   console.log('ok:', ok);
//   // .forEach(function(user) {
//   //   promises.push(new Promise(async resolve => {
//   //     try {
//   //       await db.collection('users').updateOne(
//   //         { _id: new ObjectID(user._id) },
//   //         { $set: { 'token': null, 'tokenCreatedAt': null } }
//   //       );
//   //     } catch (error) {
//   //       logger.error(error);
//   //       Sentry.captureException(error);
//   //     }
//   //     count++;
//   //     resolve();
//   //   }));
//   // });
//   // await Promise.all(promises);

//   logger.info(`${count} conseillerObj ont été corrigé`);
//   exit();
// });

const path = require('path');
const fs = require('fs');

const { execute } = require('../utils');
const dayjs = require('dayjs');

execute(__filename, async ({ logger, db }) => {
  let promises = [];
  let count = 0;
  logger.info(`Generating CSV file...`);
  let csvFile = path.join(__dirname, '../../../data/exports', 'date_incorrects_mises_en_relation2.csv');
  const date = date => dayjs(date, 'YYYY-MM-DD').toDate();
  let file = fs.createWriteStream(csvFile, {
    flags: 'w'
  });

  file.write('status; conseiller email; date incorrect; structure email\n');
  await db.collection('misesEnRelation').find(
    // { 'conseillerObj.dateDeNaissance':
    {
      // { $lte: date('1920-01-01T00:00:00Z'), $gte: date('2000-01-01T00:00:00Z') }
      'dateRecrutement': { $gt: new Date('2025') }
      // 'dateRecrutement': { $lte: date('2021-01-01T00:00:00Z'), $gte: date('2022-12-31T00:00:00Z') }
    }
  ).forEach(ms => {
    promises.push(new Promise(async resolve => {
      count++;
      file.write(`${ms.statut}; ${ms.conseillerObj.email}; ${ms.dateRecrutement}; ${ms.structureObj.contact.email}\n`);
      resolve();
    }));
  });
  await Promise.all(promises);
  logger.info(`${count} conseillerObj ont été exporter`);
  file.close();
});
