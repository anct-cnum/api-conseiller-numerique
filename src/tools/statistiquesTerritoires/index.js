#!/usr/bin/env node
'use strict';

const cli = require('commander');
const { execute } = require('../utils');
const { ObjectID } = require('mongodb');
const dayjs = require('dayjs');
const utilsStructure = require('../../utils/index.js');
const departements = require('../../../data/imports/departements-region.json');

cli.description('Statistiques pour les territoires').parse(process.argv);

execute(__filename, async ({ logger, db, Sentry }) => {

  logger.info('Récupération des différentes données nécessaires aux statistiques par territoires...');
  const deps = new Map();
  for (const value of departements) {
    deps.set(String(value.num_dep), value);
  }

  let promiseStructure = [];
  let promiseConseillers = [];

  await deps.forEach(departement => {
    promiseStructure.push(new Promise(async resolve => {
      const structures = await db.collection('structures').find({ 'statut': 'VALIDATION_COSELEC', 'codeDepartement': String(departement.num_dep) }).toArray();

      let DepStats = {};
      DepStats.date = dayjs(new Date()).format('DD/MM/YYYY');
      DepStats.codeDepartement = String(departement.num_dep);
      DepStats.nomDepartement = departement.dep_name;
      DepStats.nomRegion = departement.region_name;
      DepStats.nombreConseillersCoselec = 0;
      DepStats.cnfsActives = 0;
      DepStats.cnfsInactives = 0;
      DepStats.conseillerIds = [];

      structures.forEach(structure => {
        DepStats.codeRegion = String(structure.codeRegion);
        const coselec = utilsStructure.getCoselec(structure);
        DepStats.nombreConseillersCoselec += coselec?.nombreConseillersCoselec ?? 0;
        DepStats.cnfsInactives = DepStats.nombreConseillersCoselec;

        promiseConseillers.push(new Promise(async resolve => {

          const conseillers = await db.collection('conseillers').find({
            'statut': 'RECRUTE',
            'structureId': new ObjectID(structure._id)
          }).toArray();

          if (conseillers.length > 0) {
            let userPromises = [];
            conseillers.forEach(conseiller => {
              DepStats.conseillerIds.push(conseiller._id);
              userPromises.push(new Promise(async resolve => {
                const isActive = await db.collection('users').countDocuments({
                  'entity.$id': new ObjectID(conseiller._id), 'entity.$ref': 'conseillers', 'passwordCreated': true
                });
                if (isActive > 0) {
                  DepStats.cnfsActives += 1;
                  DepStats.cnfsInactives -= 1;
                }
                resolve();
              }));
            });
            await Promise.all(userPromises);
          }
          resolve();
        }));
      });
      await Promise.all(promiseConseillers);

      DepStats.tauxActivation = (DepStats?.cnfsActives) ??
      DepStats?.cnfsActives * 100 / (DepStats?.nombreConseillersCoselec);

      if (structures.length > 0) {
        try {
          logger.info('Insertion de l\'aggregation des ' + structures.length + ' structure(s) du département  ' + departement.num_dep);
          await db.collection('stats_Territoires').insertOne(DepStats);
        } catch (error) {
          logger.error(error);
          Sentry.captureException(error);
        }
      } else {
        logger.info('Pas de structure valide pour le département : ' + departement.num_dep);
      }
      resolve();
    }));
  });
  await Promise.all(promiseStructure);

});
