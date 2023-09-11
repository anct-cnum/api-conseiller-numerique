#!/usr/bin/env node
'use strict';

const { execute } = require('../utils');
const { program } = require('commander');

program.parse(process.argv);

execute(__filename, async ({ db, logger }) => {
  const cacher = async c => {
    const result = await db.collection('misesEnRelation').deleteMany(
      {
        'conseiller.$id': c._id,
        'statut': 'nouvelle'
      }
    );

    logger.info(`${c._id} ${result.modifiedCount} modified documents.`);
  };

  // Chercher les candidats NON disponibles qui ont des mises en relations
  const conseillers = await db.collection('conseillers').find({ disponible: false }).toArray();

  for (const c of conseillers) {
    await cacher(c);
  }
});
