#!/usr/bin/env node
'use strict';

require('dotenv').config();

const { execute } = require('../utils');
const { ObjectId } = require('mongodb');
const { program } = require('commander');

const getCrasSansOrganisme = db => async limit => {
  return await db.collection('cras').find({ 'cra.organisme': { '$eq': null, '$exists': true } }).limit(limit).toArray();
};
const getCrasAvecOrganisme = db => async limit => {
  return await db.collection('cras').find({ 'cra.organisme': { '$ne': null } }).limit(limit).toArray();
};
const updateCra = db => async (id, cra) => {
  await db.collection('cras').updateOne({ '_id': new ObjectId(id) }, {
    $set: {
      'cra': cra,
    }
  });
};

program.option('-l, --limit <limit>', 'Nombre de cras', parseInt).parse(process.argv);

execute(__filename, async ({ logger, db }) => {
  let { limit = 5000 } = program;
  let modifiedCountSansOrganisme = 0;
  let modifiedCountAvecOrganisme = 0;

  /*1ère étape : s'occuper des cras sans organisme */
  logger.info(`Traitement des cras sans organisme`);
  const crasSansOrganisme = await getCrasSansOrganisme(db)(limit);
  try {
    let promisesSansOrganisme = [];
    crasSansOrganisme?.forEach(cra => {
      promisesSansOrganisme.push(new Promise(async resolve => {
        delete cra.cra.organisme;
        cra.cra.organismes = null;
        updateCra(db)(cra._id, cra.cra);
        modifiedCountSansOrganisme++;
        resolve();
      }));
    });
  } catch (error) {
    logger.info(`Une erreurs s'est produite lors de la mise à jour des CRAs`, error);
  }
  logger.info(`${modifiedCountSansOrganisme} CRAs sans organisme mis à jour`);

  /*2ème étape : s'occuper des cras avec organisme */
  logger.info(`Traitement des cras avec organisme`);
  const crasAvecOrganisme = await getCrasAvecOrganisme(db)(limit);
  try {
    let promisesAvecOrganisme = [];
    crasAvecOrganisme?.forEach(cra => {
      promisesAvecOrganisme.push(new Promise(async resolve => {
        cra.cra.organismes = [{ [cra.cra.organisme]: 1 }];
        delete cra.cra.organisme;
        updateCra(db)(cra._id, cra.cra);
        modifiedCountAvecOrganisme++;
        resolve();
      }));
    });
  } catch (error) {
    logger.info(`Une erreurs s'est produite lors de la mise à jour des CRAs`, error);
  }
  logger.info(`${modifiedCountAvecOrganisme} CRAs avec organisme mis à jour`);
});

