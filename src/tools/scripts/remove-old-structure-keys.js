#!/usr/bin/env node
'use strict';

const { execute } = require('../utils');

execute(async ({ db, logger }) => {
  await db.collection('structures').update({ }, {
    $unset: {
      nombreConseillersPrefet : '',
      avisPrefet: '',
      commentairePrefet: '',
      avisCoselec: '',
      nombreConseillersCoselec : '',
      observationsReferent : '',
      prioritaireCoselec : '',
      contactPrenom : '',
      contactNom : '',
      contactFonction : '',
      contactEmail : '',
      contactTelephone : ''
    },
  });
});

