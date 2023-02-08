#!/usr/bin/env node
'use strict';

const { execute } = require('../utils');

execute(__filename, async ({ logger, db, exit }) => {
  let collectionCrasAndPermanence = {
    'nomEnseigne': 'permanences',
    'adresse.numeroRue': 'permanences',
    'adresse.rue': 'permanences',
    'adresse.codePostal': 'permanences',
    'adresse.ville': 'permanences',
    'cra.nomCommune': 'cras',
    'cra.codePostal': 'cras'
  };

  let stat = {
    'nomEnseigne': 0,
    'adresse.numeroRue': 0,
    'adresse.rue': 0,
    'adresse.codePostal': 0,
    'adresse.ville': 0,
    'cra.nomCommune': 0,
    'cra.codePostal': 0
  };

  let impactCN = {
    'nomEnseigne': [],
    'adresse.numeroRue': [],
    'adresse.rue': [],
    'adresse.codePostal': [],
    'adresse.ville': [],
    'cra.nomCommune': [],
    'cra.codePostal': []
  };
  let counExecute = {
    ...stat
  };

  try {
    for (const [key, value] of Object.entries(collectionCrasAndPermanence)) {
      const result = await db.collection(value).distinct(key, { [key]: { $regex: '(^\\s.+)|(.+\\s$)' } });
      collectionCrasAndPermanence[key] = result;
      stat[key] = result.length;
      const distinctIdCN = ['cra.nomCommune', 'cra.codePostal'].includes(key) ? 'conseiller.$id' : 'conseillers';
      const statImpactCN = await db.collection(value).distinct(distinctIdCN, { [key]: { $regex: '(^\\s.+)|(.+\\s$)' } });
      impactCN[key] = statImpactCN.map(e => e.toString());
    }

    for (const [key, value] of Object.entries(collectionCrasAndPermanence)) {
      for (const i of value) {
        const collection = ['cra.nomCommune', 'cra.codePostal'].includes(key) ? 'cras' : 'permanences';
        const resultUpdateMany = await db.collection(collection).updateMany({ [key]: { '$eq': i } }, { '$set': { [key]: i?.trim() } });
        logger.info(`${key} => "${i}" => "${i.trim()}" (${resultUpdateMany.modifiedCount} / ${resultUpdateMany.matchedCount})`);
        counExecute[key]++;
      }
      logger.info(`Result avant correction du ${key} : ${stat[key]}, correction ok => ${counExecute[key]}`);
    }
  } catch (e) {
    logger.error(e);
  }
  const arrayImpactCN = [].concat(...Object.values(impactCN));
  const resultImpactCn = [...new Set(arrayImpactCN)];
  logger.info(`${resultImpactCn.length} conseillers concernés`);
  exit();
});
