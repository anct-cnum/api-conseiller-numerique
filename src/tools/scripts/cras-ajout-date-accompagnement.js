#!/usr/bin/env node
'use strict';

require('dotenv').config();

const { execute } = require('../utils');
const { ObjectId } = require('mongodb');
const { program } = require('commander');

const getCrasSansDateAccompagnement = db => async limit => {
  return await db.collection('cras').find({ 'cra.dateAccompagnement': { '$eq': null } }).limit(limit).toArray();

};

const updateCra = db => async (id, date) => {
  await db.collection('cras').updateOne({ '_id': new ObjectId(id) }, {
    $set: {
      'cra.dateAccompagnement': date,
      'cra.organisme': null,
    }
  });
};

program.option('-l, --limit <limit>', 'Nombre de cras', parseInt).parse(process.argv);

execute(__filename, async ({ logger, db }) => {
  let { limit = 500 } = program;
  let modifiedCount = 0;
  const cras = await getCrasSansDateAccompagnement(db)(limit);

  try {
    let promises = [];
    cras.forEach(cra => {
      promises.push(new Promise(async resolve => {
        updateCra(db)(cra._id, cra.createdAt);
        modifiedCount++;
        resolve();
      }));
    });
    await Promise.all(promises);
  } catch (error) {
    logger.info(`Une erreurs s'est produite lors de la mise à jour des CRAs`, error);
  }
  logger.info(`${modifiedCount} CRAs mis à jour`);
});

