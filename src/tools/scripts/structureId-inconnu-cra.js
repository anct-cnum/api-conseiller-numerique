#!/usr/bin/env node
'use strict';

const { execute } = require('../utils');
const { ObjectId } = require('mongodb');

// node src/tools/scripts/structureId-inconnu-cra.js

execute(__filename, async ({ logger, db }) => {
  let crasStructureId = await db.collection('cras').distinct('structure.$id');
  // prendre tout les _id structures car il peut y avoir des changements de statut entre temps
  let structures = await db.collection('structures').distinct('_id');
  crasStructureId = crasStructureId.map(id => String(id));
  structures = structures.map(id => String(id));
  let structureId = crasStructureId.filter(i => !structures.includes(i)); // liste Id structure inconnu
  let promises = [];

  structureId = structureId.map(id => new ObjectId(id));
  logger.info(`Correction des ${structureId.length} structureId inconnu...`);
  structureId.forEach(structureId => {
    promises.push(new Promise(async resolve => {
      const ArrayCras = await db.collection('cras').find({ 'structure.$id': structureId }).toArray();
      const conseiller = await db.collection('conseillers').findOne({ '_id': ArrayCras[0]?.conseiller?.oid });
      const countCras = ArrayCras.length;
      if (countCras === 1) {
        if (conseiller?.statut === 'RECRUTE' && !conseiller?.ruptures) { // => TEST OK
          await db.collection('cras').updateOne({ 'structure.$id': structureId }, { $set: { 'structure.$id': conseiller?.structureId } });
          logger.info(`Conseiller idPG ${conseiller.idPG}  ${structureId} => ${conseiller?.structureId} (contrat en cours)`);
        } else if (conseiller?.statut === 'RECRUTE' && conseiller?.ruptures) { // => TEST OK
          const dateAccompagnement = ArrayCras[0].cra.dateAccompagnement;
          const ruptures = conseiller?.ruptures.filter(i => dateAccompagnement <= i.dateRupture);
          const id = ruptures.length === 0 ? conseiller?.structureId : ruptures[0]?.structureId;
          await db.collection('cras').updateOne({ 'structure.$id': structureId }, { $set: { 'structure.$id': id } });
          logger.info(`Conseiller idPG ${conseiller.idPG}  ${structureId} => ${id} (contrat en cours & rupture)`);
        } else if (conseiller?.statut === 'RUPTURE' && conseiller?.ruptures.length === 1) { // => TEST OK
          await db.collection('cras').updateOne({ 'structure.$id': structureId }, { $set: { 'structure.$id': conseiller?.ruptures[0].structureId } });
          logger.info(`Conseiller idPG ${conseiller.idPG}  ${structureId} => ${conseiller?.ruptures[0].structureId} (rupture)`);
        } else {
          // Cas qui ne devrait pas y avoir normalement...
          logger.error(`Conseiller idPG ${conseiller?.idPG} en erreur ! (${countCras})`);
        }
      } else {
        // Cas qui ne devrait pas y avoir normalement...
        logger.error(`Il y a ${countCras} CRAS qui ont l'id ${structureId} (conseiller ${ArrayCras[0]?.conseiller?.oid})`);
      }
      resolve();
    }));
  });
  await Promise.all(promises);
});

