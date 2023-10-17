#!/usr/bin/env node
'use strict';

const { execute } = require('../utils');

const getPermanencesVides = async db => await db.collection('permanences').find({
  'conseillers': []
}).toArray();

const getCrasIdsConseillers = db => async idPermanence => await db.collection('cras').distinct(
  'conseiller.$id',
  { 'permanence.$id': idPermanence }
);

const checkConseillerOK = db => async idConseiller => {
  const result = await db.collection('conseillers').findOne({
    '_id': idConseiller
  });
  return result.status === 'RECRUTE';
};

const updateCras = db => async idPermanence => await db.collection('cras').updateMany(
  { 'permanence.$id': idPermanence },
  { '$unset': { 'permanence': '' } }
);

const deletePermanence = db => async idPermanence => await db.collection('permanences').deleteOne({
  '_id': idPermanence
});

execute(__filename, async ({ exit, logger, db }) => {
  const promises = [];
  logger.info('Début du script de nettoyage des Permanences vides');
  const permanences = await getPermanencesVides(db);
  permanences.forEach(permanence => {
    promises.push(new Promise(async resolve => {
      const crasIdsConseillers = await getCrasIdsConseillers(db)(permanence._id);
      if (crasIdsConseillers.length > 0) {
        try {
          for (const idConseiller of crasIdsConseillers) {
            const isConseillerOk = await checkConseillerOK(idConseiller);
            if (!isConseillerOk) {
              logger.info('Modification des CRAs comportant la permanence ' + permanence._id);
              await updateCras(db)(permanence._id).then(() => {
                logger.info('Les CRAs comportant l\'id de permanence ' + permanence._id + ' ont été modifiés avec succès');
              });
              logger.info('Suppression de la permanence ' + permanence._id);
              await deletePermanence(db)(permanence._id).then(() => {
                logger.info('Suppression de la permanence ' + permanence._id + ' réalisée avec succès');
              });
            } else {
              logger.info('Attention : Le conseiller ' + idConseiller + ' est toujours actif et possède des cras avec la permanence ' + permanence._id);
            }
          }
        } catch (error) {
          logger.error('Erreur lors de la modification des CRA comportant la permanence ' + permanence._id);
          logger.error(error);
        }
      } else {
        try {
          await deletePermanence(db)(permanence._id).then(() => {
            logger.info('Suppression de la permanence ' + permanence._id + ' réalisée avec succès');
          });
        } catch (error) {
          logger.error('Erreur lors de la suppression de la permanence ' + permanence._id);
          logger.error(error);
        }
      }
      logger.info('Suppression de la permanence ' + permanence._id);
      resolve();
    }));
  });

  await Promise.all(promises);

  logger.info('Fin du script de nettoyage des permanences');
  exit();
});
