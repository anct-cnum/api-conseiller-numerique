#!/usr/bin/env node
'use strict';

require('dotenv').config();

const { execute } = require('../../utils');

const getConseillers = async db => await db.collection('conseillers').find({
  'estCoordinateur': true,
  'listeSubordonnes': { '$exists': false }
}).toArray();

const isUserCoordinateur = db => async id => {
  const result = await db.collection('users').findOne({
    'entity.$id': id,
    'roles': { '$in': ['coordinateur_coop'] }
  });
  return result !== null;
};

const updateEstCoordinateurConseiller = db => async id => await db.collection('conseillers').updateOne(
  { '_id': id },
  { $set: { 'estCoordinateur': false } },
);

const updateEstCoordinateurMisesEnRelation = db => async id => await db.collection('misesEnRelation').updateMany(
  { 'conseiller.$id': id },
  { $set: { 'conseillerObj.estCoordinateur': false } },
);

execute(__filename, async ({ db, logger, exit }) => {
  logger.info('Reset des coordinateurs autoproclamés depuis le formulaire de permanence...');
  const promises = [];
  const conseillers = await getConseillers(db);

  conseillers.forEach(conseiller => {
    promises.push(new Promise(async resolve => {
      if (!await isUserCoordinateur(db)(conseiller._id)) {
        logger.info('Le conseiller (idPG: ' + conseiller.idPG + ') n\'a pas de rôle coordinateur');
        await updateEstCoordinateurConseiller(db)(conseiller._id).then(async () => {
          logger.info('Le conseiller (idPG: ' + conseiller.idPG + ') a été mis à jour');
          await updateEstCoordinateurMisesEnRelation(db)(conseiller._id).then(() => {
            logger.info('Les mises en relation du conseiller (idPG: ' + conseiller.idPG + ') ont été mise à jour');
          });
        });
      }
      resolve();
    }));
  });
  Promise.all(promises);
  logger.info('Fin du reset du flag estCoordinateur.');
  exit();
});
