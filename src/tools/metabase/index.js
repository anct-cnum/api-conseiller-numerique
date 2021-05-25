#!/usr/bin/env node
'use strict';

const cli = require('commander');
const { execute } = require('../utils');

cli.description('Data pour métabase').parse(process.argv);

execute(__filename, async ({ logger, db, app, Sentry }) => {
  logger.info('Récupération des différentes données nécessaires au métabase public...');

  const postesValidesDepartement = [];
  const postesValidesStructure = [];
  const conseillersRecrutesDepartement = [];
  const conseillersRecrutesStructure = [];
  const candidats = [];
  const structuresCandidates = [];

  /* Nombre de postes validés par département */
  const queryPosteValidesDepartement = [
    { $match: { 'statut': 'VALIDATION_COSELEC', 'coselec': { '$elemMatch': { 'avisCoselec': 'POSITIF' } } } },
    { $unwind: '$coselec' },
    { $group: { _id: '$codeDepartement', count: { $sum: '$coselec.nombreConseillersCoselec' } } },
  ];
  const nombrePostesValidesDepartement = await db.collection('structures').aggregate(queryPosteValidesDepartement).toArray();
  if (nombrePostesValidesDepartement.length > 0) {
    nombrePostesValidesDepartement.forEach(posteValide => {
      let ligne = {
        'departement': posteValide._id,
        'nombrePostesValidesDepartement': posteValide.count
      };
      postesValidesDepartement.push(ligne);
    });
  }

  /* Nombre de postes validés par structure */
  const queryPosteValidesStructures = [
    { $match: { 'statut': 'VALIDATION_COSELEC', 'coselec': { '$elemMatch': { 'avisCoselec': 'POSITIF' } } } },
    { $unwind: '$coselec' },
    { $group: { _id: '$nom', count: { $sum: '$coselec.nombreConseillersCoselec' } } },

  ];
  const nombrePostesValidesStructures = await db.collection('structures').aggregate(queryPosteValidesStructures).toArray();
  if (nombrePostesValidesStructures.length > 0) {
    nombrePostesValidesStructures.forEach(posteValide => {
      let ligne = {
        'structure': posteValide._id,
        'nombrePostesValidesStructures': posteValide.count
      };
      postesValidesStructure.push(ligne);
    });
  }

  /* Nombre de conseillers recrutés par département */
  const queryNombreConseillersRecrutesDepartement = [
    { '$match': { 'statut': { $eq: 'recrutee' } } },
    { $group: { _id: '$structureObj.codeDepartement', count: { $sum: 1 } } },
  ];
  const listConseillersRecrutesDepartement = await db.collection('misesEnRelation').aggregate(queryNombreConseillersRecrutesDepartement).toArray();
  if (listConseillersRecrutesDepartement.length > 0) {
    listConseillersRecrutesDepartement.forEach(conseiller => {
      let ligne = {
        'departement': conseiller._id,
        'nombreConseillersDepartement': conseiller.count
      };
      conseillersRecrutesDepartement.push(ligne);
    });
  }

  /* Nombre de conseillers recrutés par structure */
  const queryNombreConseillersRecrutesStructure = [
    { '$match': { 'statut': { $eq: 'recrutee' } } },
    { $group: { _id: '$structureObj.nom', count: { $sum: 1 } } },
  ];
  const listConseillersRecrutesStructure = await db.collection('misesEnRelation').aggregate(queryNombreConseillersRecrutesStructure).toArray();
  if (listConseillersRecrutesStructure.length > 0) {
    listConseillersRecrutesStructure.forEach(conseiller => {
      let ligne = {
        'departement': conseiller._id,
        'nombreConseillersStructure': conseiller.count
      };
      conseillersRecrutesStructure.push(ligne);
    });
  }

  /* Nombre de candidats par département */
  const queryNombreCandidats = [
    { '$match': { 'conseillerObj.disponible': true, 'statut': { $ne: 'recrutee' } } },
    { $group: { _id: '$structureObj.codeDepartement', count: { $sum: 1 } } },
  ];
  const listCandidats = await db.collection('misesEnRelation').aggregate(queryNombreCandidats).toArray();
  if (listCandidats.length > 0) {
    listCandidats.forEach(candidat => {
      let ligne = {
        'departement': candidat._id,
        'nombreCandidatsDepartement': candidat.count
      };
      candidats.push(ligne);
    });
  }


  /* Nombre de structures candidates par département */
  const queryNombreStructures = [
    { $match: { statut: 'CREEE' } },
    { $group: { _id: '$codeDepartement', count: { $sum: 1 } } }
  ];
  const nombreStructures = await db.collection('structures').aggregate(queryNombreStructures).toArray();
  if (nombreStructures.length > 0) {
    nombreStructures.forEach(structure => {
      let ligne = {
        'departement': structure._id,
        'nombreStructures': structure.count
      };
      structuresCandidates.push(ligne);
    });
  }

  try {

    const insert = {
      date: new Date(),
      data: {
        'postesValidesDepartement': postesValidesDepartement,
        'postesValidesStructure': postesValidesStructure,
        'conseillersRecrutesDepartement': conseillersRecrutesDepartement,
        'conseillersRecrutesStructure': conseillersRecrutesStructure,
        'candidats': candidats,
        'structuresCandidates': structuresCandidates
      }
    };
    await app.service('metabase').create(insert);

  } catch (error) {
    logger.error(error);
  }

});
