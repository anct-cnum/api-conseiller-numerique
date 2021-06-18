#!/usr/bin/env node
'use strict';

const cli = require('commander');
const { execute } = require('../utils');
const moment = require('moment');
const utilsStructure = require('../../utils/index.js');

cli.description('Data pour metabase').parse(process.argv);

execute(__filename, async ({ logger, db, Sentry }) => {
  logger.info('Récupération des différentes données nécessaires au metabase public...');

  const key = moment(new Date()).format('DD/MM/YYYY');
  const date = new Date();
  const departements = require('../../../data/imports/departements-region.json');
  let lignes = [];

  /* Nombre de postes validés par département */
  const structures = await db.collection('structures').find({ 'statut': 'VALIDATION_COSELEC' }).sort({ codeDepartement: 1 }).toArray();
  let posteParDepartement = [];
  structures.forEach(structure => {
    let coselecPositif = utilsStructure.getCoselecPositif(structure);
    if (coselecPositif) {
      const departement = String(structure.codeDepartement);
      if (posteParDepartement[departement]) {
        posteParDepartement[departement] += coselecPositif.nombreConseillersCoselec;
      } else {
        posteParDepartement[departement] = coselecPositif.nombreConseillersCoselec;
      }
    }
  });
  departements.forEach(departement => {
    if (posteParDepartement[departement.num_dep]) {
      lignes.push({
        'numeroDepartement': departement.num_dep,
        'departement': departement.dep_name,
        'nombrePostesValides': posteParDepartement[departement.num_dep]
      });
    }
  });
  const postesValidesDepartement = ({ 'key': key, 'date': date, 'data': lignes });

  /* Nombre de postes validés par structure */
  const structuresPostesValides = await db.collection('structures').find({ 'statut': 'VALIDATION_COSELEC' }).sort({ nom: 1 }).toArray();
  lignes = [];
  structuresPostesValides.forEach(structure => {
    let coselecPositif = utilsStructure.getCoselecPositif(structure);
    if (coselecPositif) {
      lignes.push({
        'structure': structure.nom,
        'nombrePostesValides': coselecPositif.nombreConseillersCoselec
      });
    }
  });

  const postesValidesStructure = ({ 'key': key, 'date': date, 'data': lignes });

  /* Nombre de conseillers recrutés par département */
  const queryNombreConseillersRecrutesDepartement = [
    { '$match': { 'statut': { $eq: 'recrutee' } } },
    { $group: { _id: '$structureObj.codeDepartement', count: { $sum: 1 } } },
    { $sort: { _id: 1 } }
  ];
  const listConseillersRecrutesDepartement = await db.collection('misesEnRelation').aggregate(queryNombreConseillersRecrutesDepartement).toArray();
  lignes = [];
  if (listConseillersRecrutesDepartement.length > 0) {
    listConseillersRecrutesDepartement.forEach(conseiller => {
      departements.forEach(departement => {
        if (String(departement.num_dep) === String(conseiller._id)) {
          lignes.push({
            'numeroDepartement': conseiller._id,
            'departement': departement.dep_name,
            'nombreConseillers': conseiller.count
          });
        }
      });
    });
  }
  const conseillersRecrutesDepartement = ({ 'key': key, 'date': date, 'data': lignes });

  /* Nombre de conseillers recrutés par structure */
  const queryNombreConseillersRecrutesStructure = [
    { '$match': { 'statut': { $eq: 'recrutee' } } },
    { $group: { _id: '$structureObj._id', count: { $sum: 1 }, nomStructure: { $first: '$structureObj.nom' } } },
  ];
  const listConseillersRecrutesStructure = await db.collection('misesEnRelation').aggregate(queryNombreConseillersRecrutesStructure).toArray();
  lignes = [];
  if (listConseillersRecrutesStructure.length > 0) {
    listConseillersRecrutesStructure.forEach(conseiller => {
      lignes.push({
        'structure': conseiller.nomStructure,
        'nombreConseillers': conseiller.count
      });
    });
  }
  const conseillersRecrutesStructure = ({ 'key': key, 'date': date, 'data': lignes });

  /* Nombre de candidats par département */
  const queryNombreCandidats = [
    { '$match': { 'conseillerObj.disponible': true, 'statut': { $ne: 'recrutee' } } },
    { $group: { _id: '$structureObj.codeDepartement', count: { $sum: 1 } } },
    { $sort: { _id: 1 } }
  ];
  const listCandidats = await db.collection('misesEnRelation').aggregate(queryNombreCandidats).toArray();
  lignes = [];
  if (listCandidats.length > 0) {
    listCandidats.forEach(candidat => {
      departements.forEach(departement => {
        if (String(departement.num_dep) === String(candidat._id)) {
          lignes.push({
            'numeroDepartement': candidat._id,
            'departement': departement.dep_name,
            'nombreCandidats': candidat.count
          });
        }
      });
    });
  }
  const candidats = ({ 'key': key, 'date': date, 'data': lignes });


  /* Nombre de structures candidates par département */
  const queryNombreStructures = [
    { $match: { statut: 'CREEE' } },
    { $group: { _id: '$codeDepartement', count: { $sum: 1 } } },
    { $sort: { _id: 1 } }
  ];
  const nombreStructures = await db.collection('structures').aggregate(queryNombreStructures).toArray();
  lignes = [];
  if (nombreStructures.length > 0) {
    nombreStructures.forEach(structure => {
      departements.forEach(departement => {
        if (String(departement.num_dep) === String(structure._id)) {
          lignes.push({
            'numeroDepartement': structure._id,
            'departement': departement.dep_name,
            'nombre': structure.count
          });
        }
      });
    });
  }
  const structuresCandidates = ({ 'key': key, 'date': date, 'data': lignes });

  try {
    db.collection('stats_PostesValidesDepartement').insertOne(postesValidesDepartement);
    db.collection('stats_PostesValidesStructure').insertOne(postesValidesStructure);
    db.collection('stats_ConseillersRecrutesDepartement').insertOne(conseillersRecrutesDepartement);
    db.collection('stats_ConseillersRecrutesStructure').insertOne(conseillersRecrutesStructure);
    db.collection('stats_Candidats').insertOne(candidats);
    db.collection('stats_StructuresCandidates').insertOne(structuresCandidates);
  } catch (error) {
    Sentry.captureException(error);
    logger.error(error);
  }

});
