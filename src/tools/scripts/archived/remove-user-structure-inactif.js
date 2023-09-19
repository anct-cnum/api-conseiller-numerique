#!/usr/bin/env node
'use strict';

const { execute } = require('../../utils');
const whiteList = ['EXAMEN_COMPLEMENTAIRE_COSELEC', 'REFUS_COSELEC', 'ABANDON', 'ANNULEE', 'DOUBLON', 'NEGATIF'];

execute(__filename, async ({ db, logger, exit, Sentry }) => {
  try {
    // Recupération des structures dont le statut est en 'ABANDON' ou 'ANNULEE'.
    const structures = await db.collection('structures').find({
      'statut': { $in: whiteList }
    }).toArray();
    logger.info(`Nombre de structures à traiter: ${structures.length}`);

    // Si il n'y a pas de structures à traiter, nous sortons du script.
    if (structures.length === 0) {
      logger.info('Aucune structure à traiter');
      return;
    }
    
    for (const structure of structures) {
      // Si la structure a une mise en relation dont le statut est 'finalisee' , nous ne declarons pas la structure comme inactive.
      const misesEnRelationFinalisee = await db.collection('misesEnRelation').findOne({
        'structure.$id': structure._id,
        'statut': { $in: ['finalisee', 'finalisee_rupture', 'terminee', 'reconventionnement_initiee'] }
      });
      if (misesEnRelationFinalisee) {
        logger.info(`La structure ${structure._id} a une mise en relation finalisée ou en rupture, nous ne déclarons pas la structure comme inactive`);
        continue;
      }
      // Nous récupérons les mises en relation de la structure dont le statut n'est pas 'finalisee_rupture' ou 'terminee'.
      const misesEnRelationASupprimer = await db.collection('misesEnRelation').find({
        'structure.$id': structure._id,
      }).toArray();
      
      // Nous supprimons les mises en relation à supprimer.
      if (misesEnRelationASupprimer.length > 0) {
        await db.collection('misesEnRelation').deleteMany({ _id: 'structure.$id' });
        logger.info(`Nombre de mises en relation à supprimer: ${misesEnRelationASupprimer.length}`);
      }
      // Nous supprimons les utilisateurs associés à la structure.
      const deleteResult = await db.collection('users').deleteMany({ 'entity.$id': structure._id });

      // Après avoir supprimé les utilisateurs, nous mettons à jour le champ 'createdUser' de la structure.
      if (deleteResult.deletedCount > 0) {
        await db.collection('structures').updateOne({ _id: structure._id }, { $set: { userCreated: false } });
      }
    }
    logger.info('Fin de suppression des structures inactives');
    exit();
  } catch (error) {
    logger.error(error);
    Sentry.captureException(error);
  }
});

