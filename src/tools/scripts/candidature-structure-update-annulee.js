#!/usr/bin/env node
/** @format */

'use strict';

const { execute } = require('../utils');

// node src/tools/scripts/candidature-structure-update-annulee.js

execute(__filename, async ({ logger, db }) => {
  const date = new Date('2023-12-31');
  await db.collection('structures').updateMany(
    {
      'statut': {
        $in: ['CREEE', 'EXAMEN_COMPLEMENTAIRE_COSELEC'],
      },
      'coordinateurCandidature': false,
      'createdAt': { $lte: date },
      'coselec.nombreConseillersCoselec': { $nin: [1] },
    },
    {
      $set: { statut: 'ANNULEE', siret: null },
    }
  );
  logger.info(`Annulation des candidatures structures avant le ${date}`);
});
