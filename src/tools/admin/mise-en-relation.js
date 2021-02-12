#!/usr/bin/env node
'use strict';

const { execute } = require('../utils');
const { program } = require('commander');
const { ObjectID, DBRef } = require('mongodb');
program.version('0.0.1');

program
.option('-f, --file <file>', 'file path');

program.parse(process.argv);

execute(async ({ db, logger }) => {
  // Pour chaque structure, générer ses mises en relation
  const miseEnRelation = async (s, c) => {
    logger.info(c.nom);
    logger.info(c.dist.calculated);

    // Respecte la distance max du conseiller
    if (c.dist.calculated > c.distanceMax) {
      return;
    }

    // xxx Vérifie les dates de dispo

    const filter = {
      'structure.$id': s._id,
      'conseiller.$id': c._id
    };

    // Insere seulement si pas encore de mise en relation
    const updateDoc = {
      $set: {
        structure: new DBRef('structures', s._id, 'conseiller-numerique'),
        conseiller: new DBRef('conseillers', c._id, 'conseiller-numerique'),
      },
      $setOnInsert: {
        statut: 'nouvelle',
        createdAt: new Date(),
        conseillerCreatedAt: c.createdAt
      }
    };

    const options = { upsert: true };

    const result = await db.collection('misesEnRelation').updateOne(filter, updateDoc, options);
    console.log(
      `${result.matchedCount} document(s) matched the filter, updated ${result.modifiedCount} document(s)`,
    );
  };

  const creation = async s => {
    logger.info(`Nom : ${s.nom}`);
    logger.info(`Lieu : ${JSON.stringify(s.location)}`);
 
    // On recherche les candidats dans un périmètre autour de la structure
    // classés par distance

    const match = await db.collection('conseillers').aggregate([{
      '$geoNear': {
        'near': s.location,
        'distanceField': 'dist.calculated',
        'maxDistance': 500000,
        'query': {},
        'num': 500, // xxx use $limit
        'spherical': false
      }
    }]);

    let c;
    while ((c = await match.next())) {
      await miseEnRelation(s, c);
    }
  };

  // Chercher les structures pour lesquelles on doit créer des mises ne relation
  const match = await db.collection('structures').find({ statut: 'CREEE' }).limit(500); // xxx 'PREFET'

  let s;
  while ((s = await match.next())) {
    await creation(s);
  }
});
