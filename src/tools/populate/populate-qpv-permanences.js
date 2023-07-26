#!/usr/bin/env node
'use strict';

const { execute } = require('../utils');
const { program } = require('commander');
const circle = require('@turf/circle');

program
.option('-a, --all', 'Recalcule les QPV pour toutes les permanences');

program.parse(process.argv);

execute(__filename, async ({ db, logger }) => {
  const store = async (p, qpv, quartiers) => {
    const filter = {
      '_id': p._id,
    };

    const updateDoc = {
      $set: {
        qpvStatut: qpv,
        qpvListe: quartiers
      }
    };

    const options = { };

    try {
      await db.collection('permanences').updateOne(filter, updateDoc, options);
    } catch (error) {
      logger.info(`Erreur MongoDB : ${error.message}`);
    }

    logger.info(
      `qpv,OK,${p._id},${p.idPG},${p.nom},${qpv},${quartiers.length}`);
  };

  let query = {
    $and: [
      { location: { $exists: true } },
      { location: { $ne: null } }
    ]
  };

  if (!program.all) {
    // Chercher uniquement les permanences dont on n'a pas encore les infos de QPV
    query = { ...query, qpvStatut: { '$exists': false } };
  }

  const match = await db.collection('permanences').find(query);

  let p;
  while ((p = await match.next())) {
    let qpv;
    let quartiers;

    // On cherche si la permanence est dans un QPV, à radius kilomètres près
    const radius = 0.1; // en km
    // Comme il n'y a pas de cercle dans GeoJSON, on crée un polygone de 64 faces en approximation,
    // centré sur la permanence, et avec un rayon de radius kilomètres
    const c = circle.default(p.location, radius);

    // On cherche les intersections entre ce polygone et les quartiers
    quartiers = await db.collection('qpv').find(
      { 'geometry':
        { '$geoIntersects':
          { '$geometry': c.geometry }
        }
      }
    ).toArray();

    qpv = quartiers.length > 0 ? 'Oui' : 'Non';
    await store(p, qpv, quartiers);
  }
});
