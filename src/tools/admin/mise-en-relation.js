#!/usr/bin/env node
'use strict';

const { execute } = require('../utils');
const { program } = require('commander');
const { DBRef } = require('mongodb');
const configuration = require('@feathersjs/configuration');
const feathers = require('@feathersjs/feathers');

program.parse(process.argv);

execute(async ({ db, logger }) => {
  const app = feathers().configure(configuration());
  const connection = app.get('mongodb');
  const database = connection.substr(connection.lastIndexOf('/') + 1);

  // Pour chaque structure, générer ses mises en relation
  const miseEnRelation = async (s, c) => {
    // Respecte la distance max du conseiller
    if (c.dist.calculated > c.distanceMax * 1000) {
      logger.info(
        `misesEnRelation,KO,${s._id},${c._id},${s.nom},${c.nom},${c.prenom},${s.idPG},${c.idPG}` +
        `,distancefail,${c.distanceMax},${c.dist.calculated}`
      );
      return;
    }

    // Vérifie les dates de dispo
    const maintenant = new Date();

    if (s.dateDebutMission < maintenant && c.dateDisponibilite > maintenant) {
      logger.info(
        `misesEnRelation,KO,${s._id},${c._id},${s.nom},${c.nom},${c.prenom},${s.idPG},${c.idPG}` +
        `,datefail1,${s.dateDebutMission},${c.dateDisponibilite}`
      );
      return;
    }

    if (s.dateDebutMission >= maintenant && c.dateDisponibilite > s.dateDebutMission) {
      logger.info(
        `misesEnRelation,KO,${s._id},${c._id},${s.nom},${c.nom},${c.prenom},${s.idPG},${c.idPG}` +
        `,datefail2,${s.dateDebutMission},${c.dateDisponibilite}`
      );
      return;
    }

    const filter = {
      'structure.$id': s._id,
      'conseiller.$id': c._id
    };

    // Insere seulement si pas encore de mise en relation
    const updateDoc = {
      $set: {
        structure: new DBRef('structures', s._id, database),
        conseiller: new DBRef('conseillers', c._id, database),
        structureObj: s,
        conseillerObj: c,
        distance: Math.round(c.dist.calculated)
      },
      $setOnInsert: {
        statut: 'nouvelle',
        createdAt: new Date(),
        conseillerCreatedAt: c.createdAt
      }
    };

    const options = { upsert: true };

    const result = await db.collection('misesEnRelation').updateOne(filter, updateDoc, options);

    logger.info(
      `misesEnRelation,OK,${s._id},${c._id},${s.nom},${c.nom},${c.prenom},${s.idPG},${c.idPG},` +
      `${result.matchedCount},${result.upsertedCount},${result.upsertedId ? result.upsertedId._id : null}` +
      `,${result.modifiedCount}`
    );
  };

  const creation = async s => {
    // On recherche les candidats dans un périmètre autour de la structure
    // classés par distance

    const match = await db.collection('conseillers').aggregate([{
      '$geoNear': {
        'near': s.location,
        'distanceField': 'dist.calculated',
        'maxDistance': 500000,
        'query': { disponible: true },
        'num': 500, // xxx use $limit
        'spherical': false
      }
    }]);

    let c;
    while ((c = await match.next())) {
      await miseEnRelation(s, c);
    }
  };

  // Chercher les structures pour lesquelles on doit créer des mises en relation
  const match = await db.collection('structures').find({ statut: 'VALIDATION_COSELEC' });

  let s;
  while ((s = await match.next())) {
    await creation(s);
  }
});
