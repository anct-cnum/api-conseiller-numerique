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
    const conseillersId = [];
    for (const c of match) {
      let r = await miseEnRelation(s, c);
      if (r) {
        work.push(r);
        conseillersId.push(c._id);
      }
    }

    if (work.length > 0) {
      await db.collection('misesEnRelation').bulkWrite(work);
    }
    return conseillersId;
  };

  // Chercher les structures pour lesquelles on doit créer des mises en relation
  const match = await db.collection('structures').find({ statut: 'VALIDATION_COSELEC' }).toArray();

  const conseillersIds = [];
  for (const s of match) {
    const result = await creation(s);
    conseillersIds.push(result);
  }

  const deg2rad = deg => {
    return (deg * Math.PI) / 180;
  };

  const getDistanceFromLatLonInKm = (lat1, lng1, lat2, lng2) => {
    const Rayon = 6371; // Rayon de la terre en km
    const distanceLat = deg2rad(lat2 - lat1);
    const distanceLon = deg2rad(lng2 - lng1);
    const a =
      Math.sin(distanceLat / 2) * Math.sin(distanceLat / 2) +
      Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
      Math.sin(distanceLon / 2) * Math.sin(distanceLon / 2)
      ;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const d = Rayon * c; // Distance en km
    return d;
  };

  //Suppression des relations qui ne respectent plus la distanceMax du conseiller
  const deleteRelation = async conseillersIds => {
    await conseillersIds.forEach(async conseillersId => {
      const match = await db.collection('misesEnRelation').find({
        'conseiller.$id': { '$in': [conseillersId] },
        'statut': { '$nin': ['finalisee, finalisee_rupture'] }
      }).toArray();
      for (const r of match) {
        if (getDistanceFromLatLonInKm(
          r.conseillerObj.location.coordinates[0], r.conseillerObj.location.coordinates[1],
          r.structureObj.location.coordinates[0], r.structureObj.location.coordinates[1]) <= r.conseillerObj.distanceMax) {
          db.collection('misesEnRelation').deleteOne({ '_id': r._id });
        }
      }
    });
  };

  await deleteRelation(conseillersIds);

});
