#!/usr/bin/env node
'use strict';

const { execute } = require('../utils');
const { program } = require('commander');
const { DBRef } = require('mongodb');
const configuration = require('@feathersjs/configuration');
const feathers = require('@feathersjs/feathers');

program.parse(process.argv);

execute(__filename, async ({ db }) => {
  const app = feathers().configure(configuration());
  const connection = app.get('mongodb');
  const database = connection.substr(connection.lastIndexOf('/') + 1);

  const oneWeekAgo = new Date(new Date() - 60 * 60 * 24 * 7 * 1000);

  // Pour chaque structure, générer ses mises en relation
  const miseEnRelation = async (s, c) => {
    // Vérifie les dates de mise à jour du candidat et de la structure
    // Si pas de modifications récentes...
    if (s.updatedAt < oneWeekAgo && c.updatedAt < oneWeekAgo) {
      // ... et Coselec ancien, on ne fait rien
      if (s.coselecAt < oneWeekAgo) {
        return;
      }
      // ... si Coselec récent, on continue
    }

    // Respecte la distance max du conseiller
    if (c.dist.calculated > c.distanceMax * 1000) {
      return;
    }

    // Saint-Martin
    if (c.codePostal === '97150' && s.codePostal !== '97150') {
      return;
    }

    if (s.codePostal === '97150' && c.codePostal !== '97150') {
      return;
    }

    // Guadeloupe
    if (c.codePostal.substring(0, 3) === '971' && s.codePostal.substring(0, 3) !== '971') {
      return;
    }

    if (s.codePostal.substring(0, 3) === '971' && c.codePostal.substring(0, 3) !== '971') {
      return;
    }

    // Martinique
    if (c.codePostal.substring(0, 3) === '972' && s.codePostal.substring(0, 3) !== '972') {
      return;
    }

    if (s.codePostal.substring(0, 3) === '972' && c.codePostal.substring(0, 3) !== '972') {
      return;
    }

    // Vérifie les dates de dispo
    const maintenant = new Date();

    if (s.dateDebutMission < maintenant && c.dateDisponibilite > maintenant) {
      return;
    }

    if (s.dateDebutMission >= maintenant && c.dateDisponibilite > s.dateDebutMission) {
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

    const u = {
      updateOne: {
        filter: filter,
        update: updateDoc,
        upsert: true
      }
    };

    return u;
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
        'num': 1000, // xxx use $limit
        'spherical': false
      }
    }]).toArray();

    let work = [];

    for (const c of match) {
      let r = await miseEnRelation(s, c);
      if (r) {
        work.push(r);
      }
    }

    if (work.length > 0) {
      await db.collection('misesEnRelation').bulkWrite(work);
    }
  };

  // Chercher les structures pour lesquelles on doit créer des mises en relation
  const match = await db.collection('structures').find({ statut: 'VALIDATION_COSELEC' }).toArray();

  for (const s of match) {
    await creation(s);
  }
});
