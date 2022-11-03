#!/usr/bin/env node
'use strict';

require('dotenv').config();

const { execute } = require('../utils');
const { DBRef } = require('mongodb');

const getCraNonMaj = async db => await db.collection('cras').distinct('conseiller.$id', { 'structure.$id': { '$exists': false } });
const getConseiller = db => async id => await db.collection('conseillers').findOne({ _id: id });
const getCrasSansIdSaRGPD = db => async id => await db.collection('conseillersSupprimes').findOne({ 'conseiller._id': id });

const updateCra = (db, database) => async (idConseiller, structureId, query) => await db.collection('cras').updateMany(
  { 'conseiller.$id': idConseiller,
    'structure.$id': { '$exists': false },
    ...query
  }, {
    $set: {
      structure: new DBRef('structures', structureId, database),
    }
  });

execute(__filename, async ({ logger, db, app }) => {
  const connection = app.get('mongodb');
  const database = connection.substr(connection.lastIndexOf('/') + 1);
  const idsCnfs = await getCraNonMaj(db);
  let modifiedCount = 0;

  try {
    let promises = [];
    idsCnfs.forEach(idConseiller => {
      promises.push(new Promise(async resolve => {
        let query = {};
        const cnfs = await getConseiller(db)(idConseiller) ?? (await getCrasSansIdSaRGPD(db)(idConseiller))?.conseiller;
        if (cnfs?.ruptures) {
          query = { 'cra.dateAccompagnement': { '$lte': cnfs.ruptures[0].dateRupture } };
          await updateCra(db, database)(idConseiller, cnfs.ruptures[0].structureId, query);
        }
        if (cnfs?.statut === 'RECRUTE') {
          await updateCra(db, database)(idConseiller, cnfs.structureId, {});
        }
        modifiedCount++;
        resolve();
      }));
    });
    await Promise.all(promises);
  } catch (error) {
    logger.info(`Une erreur s'est produite lors de la mise à jour des CRAs`, error);
  }
  logger.info(`${modifiedCount} CRAs mis à jour`);
});
