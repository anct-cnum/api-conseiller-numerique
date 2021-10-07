#!/usr/bin/env node
'use strict';
const departements = require('../../../../data/imports/departements-region.json');

const { execute } = require('../../utils');
const { program } = require('commander');

program
.option('-pv, --pv', 'maj collection stats_PostesValidesDepartement')
.option('-cr, --cr', 'maj collection stats_ConseillersRecrutesDepartement')
.option('-cf, --cf', 'maj collection stats_ConseillersFinalisesDepartement')
.option('-cp, --cp', 'maj collection stats_ConseillersEnPosteDepartement')
.option('-mer, --mer', 'maj collection stats_Candidats')
.option('-sc, --sc', 'maj collection stats_StructuresCandidates');

program.parse(process.argv);

execute(__filename, async ({ db, logger, exit, Sentry }) => {

  logger.info('[Metabase] Début ajout donnée région sur les stats existantes');

  try {

    //Postes validées coselec par département
    if (program.pv === true) {
      let promessesPostesValides = [];
      const statsPostesValides = await db.collection('stats_PostesValidesDepartement').find().toArray();
      statsPostesValides.forEach(async stat => {
        promessesPostesValides.push(new Promise(async resolve => {
          logger.info('Mise à jour collection stats_PostesValidesDepartement date : ' + stat.date);
          stat.data.forEach(async dataDep => {
            promessesPostesValides.push(new Promise(async resolve => {
              logger.info('Mise à jour collection stats_PostesValidesDepartement departement : ' + dataDep.numeroDepartement);
              if (dataDep.numeroDepartement === '978') {
                await db.collection('stats_PostesValidesDepartement').updateOne(
                  { '_id': stat._id, 'data.numeroDepartement': dataDep.numeroDepartement },
                  { $set: { 'data.$.region': 'Saint-Martin' } });
              } else {
                await db.collection('stats_PostesValidesDepartement').updateOne(
                  { '_id': stat._id, 'data.numeroDepartement': dataDep.numeroDepartement },
                  { $set: { 'data.$.region': departements.find(dep => String(dep.num_dep) === String(dataDep.numeroDepartement))?.region_name } });
              }
              resolve();
            }));
            resolve();
          });
        }));
      });
      await Promise.all(promessesPostesValides);
    }

    //Conseillers validés par département
    if (program.cr === true) {
      let promessesConseillersValides = [];
      const statsConseillersValides = await db.collection('stats_ConseillersRecrutesDepartement').find().toArray();
      statsConseillersValides.forEach(async stat => {
        promessesConseillersValides.push(new Promise(async resolve => {
          logger.info('Mise à jour collection stats_ConseillersRecrutesDepartement date : ' + stat.date);
          stat.data.forEach(async dataDep => {
            promessesConseillersValides.push(new Promise(async resolve => {
              logger.info('Mise à jour collection stats_ConseillersRecrutesDepartement departement : ' + dataDep.numeroDepartement);
              if (dataDep.numeroDepartement === '978') {
                await db.collection('stats_ConseillersRecrutesDepartement').updateOne(
                  { '_id': stat._id, 'data.numeroDepartement': dataDep.numeroDepartement },
                  { $set: { 'data.$.region': 'Saint-Martin' } });
              } else {
                await db.collection('stats_ConseillersRecrutesDepartement').updateOne(
                  { '_id': stat._id, 'data.numeroDepartement': dataDep.numeroDepartement },
                  { $set: { 'data.$.region': departements.find(dep => String(dep.num_dep) === String(dataDep.numeroDepartement))?.region_name } });
              }
              resolve();
            }));
            resolve();
          });
        }));
      });
      await Promise.all(promessesConseillersValides);
    }

    //Conseillers finalisés par département
    if (program.cf === true) {
      let promessesConseillersFinalises = [];
      const statsConseillersFinalises = await db.collection('stats_ConseillersFinalisesDepartement').find().toArray();
      statsConseillersFinalises.forEach(async stat => {
        promessesConseillersFinalises.push(new Promise(async resolve => {
          logger.info('Mise à jour collection stats_ConseillersFinalisesDepartement date : ' + stat.date);
          stat.data.forEach(async dataDep => {
            promessesConseillersFinalises.push(new Promise(async resolve => {
              logger.info('Mise à jour collection stats_ConseillersFinalisesDepartement departement : ' + dataDep.numeroDepartement);
              if (dataDep.numeroDepartement === '978') {
                await db.collection('stats_ConseillersFinalisesDepartement').updateOne(
                  { '_id': stat._id, 'data.numeroDepartement': dataDep.numeroDepartement },
                  { $set: { 'data.$.region': 'Saint-Martin' } });
              } else {
                await db.collection('stats_ConseillersFinalisesDepartement').updateOne(
                  { '_id': stat._id, 'data.numeroDepartement': dataDep.numeroDepartement },
                  { $set: { 'data.$.region': departements.find(dep => String(dep.num_dep) === String(dataDep.numeroDepartement))?.region_name } });
              }
              resolve();
            }));
            resolve();
          });
        }));
      });
      await Promise.all(promessesConseillersFinalises);
    }

    //Conseillers en poste par département
    if (program.cp === true) {
      let promessesConseillersEnPoste = [];
      const statsConseillersEnPoste = await db.collection('stats_ConseillersEnPosteDepartement').find().toArray();
      statsConseillersEnPoste.forEach(async stat => {
        promessesConseillersEnPoste.push(new Promise(async resolve => {
          logger.info('Mise à jour collection stats_ConseillersEnPosteDepartement date : ' + stat.date);
          stat.data.forEach(async dataDep => {
            promessesConseillersEnPoste.push(new Promise(async resolve => {
              logger.info('Mise à jour collection stats_ConseillersEnPosteDepartement departement : ' + dataDep.numeroDepartement);
              if (dataDep.numeroDepartement === '978') {
                await db.collection('stats_ConseillersEnPosteDepartement').updateOne(
                  { '_id': stat._id, 'data.numeroDepartement': dataDep.numeroDepartement },
                  { $set: { 'data.$.region': 'Saint-Martin' } });
              } else {
                await db.collection('stats_ConseillersEnPosteDepartement').updateOne(
                  { '_id': stat._id, 'data.numeroDepartement': dataDep.numeroDepartement },
                  { $set: { 'data.$.region': departements.find(dep => String(dep.num_dep) === String(dataDep.numeroDepartement))?.region_name } });
              }
              resolve();
            }));
            resolve();
          });
        }));
      });
      await Promise.all(promessesConseillersEnPoste);
    }

    //Nombre mises en relation de candidats par département
    if (program.mer === true) {
      let promessesMisesEnRelation = [];
      const statsMisesEnRelation = await db.collection('stats_Candidats').find().toArray();
      statsMisesEnRelation.forEach(async stat => {
        promessesMisesEnRelation.push(new Promise(async resolve => {
          logger.info('Mise à jour collection stats_Candidats date : ' + stat.date);
          stat.data.forEach(async dataDep => {
            promessesMisesEnRelation.push(new Promise(async resolve => {
              logger.info('Mise à jour collection stats_Candidats departement : ' + dataDep.numeroDepartement);
              if (dataDep.numeroDepartement === '978') {
                await db.collection('stats_Candidats').updateOne(
                  { '_id': stat._id, 'data.numeroDepartement': dataDep.numeroDepartement },
                  { $set: { 'data.$.region': 'Saint-Martin' } });
              } else {
                await db.collection('stats_Candidats').updateOne(
                  { '_id': stat._id, 'data.numeroDepartement': dataDep.numeroDepartement },
                  { $set: { 'data.$.region': departements.find(dep => String(dep.num_dep) === String(dataDep.numeroDepartement))?.region_name } });
              }
              resolve();
            }));
            resolve();
          });
        }));
      });
      await Promise.all(promessesMisesEnRelation);
    }

    //Nombre de structures candidates par département
    if (program.sc === true) {
      let promessesStructures = [];
      const statsStructures = await db.collection('stats_StructuresCandidates').find().toArray();
      statsStructures.forEach(async stat => {
        promessesStructures.push(new Promise(async resolve => {
          logger.info('Mise à jour collection stats_StructuresCandidates date : ' + stat.date);
          stat.data.forEach(async dataDep => {
            promessesStructures.push(new Promise(async resolve => {
              logger.info('Mise à jour collection stats_StructuresCandidates departement : ' + dataDep.numeroDepartement);
              if (dataDep.numeroDepartement === '978') {
                await db.collection('stats_StructuresCandidates').updateOne(
                  { '_id': stat._id, 'data.numeroDepartement': dataDep.numeroDepartement },
                  { $set: { 'data.$.region': 'Saint-Martin' } });
              } else {
                await db.collection('stats_StructuresCandidates').updateOne(
                  { '_id': stat._id, 'data.numeroDepartement': dataDep.numeroDepartement },
                  { $set: { 'data.$.region': departements.find(dep => String(dep.num_dep) === String(dataDep.numeroDepartement))?.region_name } });
              }
              resolve();
            }));
            resolve();
          });
        }));
      });
      await Promise.all(promessesStructures);
    }

  } catch (e) {
    logger.error(e.message);
    Sentry.captureException(e);
  }

  logger.info('[Metabase] Fin ajout donnée région sur les stats existantes');
  exit();

});
