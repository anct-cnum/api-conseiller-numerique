#!/usr/bin/env node
'use strict';

const { execute } = require('../utils');

execute(__filename, async ({ logger, db }) => {
  const cras = await db.collection('cras').find({}).toArray();
  let promises = [];
  let conseillerCraSaisi = [];
  let count = 0;

  logger.info('Détection + correction de cras à corriger');
  cras.forEach(cra => {
    promises.push(new Promise(async resolve => {
      if (cra.cra?.nbParticipantsRecurrents > cra.cra?.nbParticipants) {
        count++;
        conseillerCraSaisi.push({
          _id: cra.conseiller.oid,
          activite: cra.cra?.activite,
          nbParticipants: cra.cra?.nbParticipants,
          nbParticipantsRecurrents: cra.cra?.nbParticipantsRecurrents,
          action: cra.cra?.activite === 'collectif' ? `changer le nbr de participant de ${cra.cra?.nbParticipants} à ${cra.cra?.nbParticipantsRecurrents}` :
            `changer le nbr de récurrent de ${cra.cra?.nbParticipantsRecurrents} à 1`
        });
        if (['individuel', 'ponctuel'].includes(cra.cra?.activite)) {
          await db.collection('cras').updateOne(
            { _id: cra._id },
            { $set: { 'cra.nbParticipantsRecurrents': 1 } }
          );
        }
        if (cra.cra?.activite === 'collectif') {
          await db.collection('cras').updateOne(
            { _id: cra._id },
            { $set: { 'cra.nbParticipants': cra.cra?.nbParticipantsRecurrents } }
          );
        }
      }
      resolve();
    }));
  });
  logger.info(conseillerCraSaisi);
  logger.info(`${count} CRA(s) corrigé(s)`);
  await Promise.all(promises);
});
