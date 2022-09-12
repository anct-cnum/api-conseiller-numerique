#!/usr/bin/env node
'use strict';
const { program } = require('commander');
const { execute } = require('../utils');

execute(__filename, async ({ logger, db }) => {
  program.option('-f, --fix', 'fix: correction des cra(s) incohérente(s)');
  program.parse(process.argv);

  const fix = program.fix;
  let promises = [];
  let conseillerCraSaisi = [];
  let count = 0;
  let countFix = 0;

  const cras = await db.collection('cras').find({}).toArray();

  logger.info('Détection + correction de cras à corriger');
  cras.forEach(cra => {
    promises.push(new Promise(async resolve => {
      if (cra.cra.nbParticipantsRecurrents > cra.cra.nbParticipants) {
        count++;
        if (fix) {
          countFix++;
          conseillerCraSaisi.push({
            _id: cra.conseiller.oid,
            activite: cra.cra.activite,
            nbParticipants: cra.cra.nbParticipants,
            nbParticipantsRecurrents: cra.cra.nbParticipantsRecurrents,
            action: `changer le nbr de récurrent de ${cra.cra?.nbParticipantsRecurrents} à ${cra.cra.nbParticipants}`
          });
          await db.collection('cras').updateOne(
            { _id: cra._id },
            { $set: { 'cra.nbParticipantsRecurrents': cra.cra.nbParticipants } }
          );
        }
      }
      resolve();
    }));
  });
  logger.info(conseillerCraSaisi);
  logger.info(`${count} CRA(s) incohérente(s) et ${countFix} CRA(s) corrigé(s)`);
  await Promise.all(promises);
});
