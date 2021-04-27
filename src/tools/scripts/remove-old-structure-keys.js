#!/usr/bin/env node
'use strict';

const { execute } = require('../utils');

execute(async ({ db }) => {
  await db.collection('structures').updateMany({ }, {
    $unset: {
      nombreConseillersPrefet: '',
      avisPrefet: '',
      commentairePrefet: '',
      avisCoselec: '',
      nombreConseillersCoselec: '',
      observationsReferent: '',
      prioritaireCoselec: '',
      contactPrenom: '',
      contactNom: '',
      contactFonction: '',
      contactEmail: '',
      contactTelephone: ''
    },
  });
});

