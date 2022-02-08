#!/usr/bin/env node
'use strict';

require('dotenv').config();

const { execute } = require('../utils');
const { program } = require('commander');

const getCrasStatutAge = db => async limit => {
  return await db.collection('cras').find({ 'cra.age': { $type: 'string' } }).limit(limit).toArray();

};

const updateCra = db => async (id, age, statut) => {
  await db.collection('cras').updateOne({ '_id': id }, {
    $set: {
      'cra.age': age,
      'cra.statut': statut,
    }
  });
};

program.option('-l, --limit <limit>', 'Nombre de cras', parseInt).parse(process.argv);

execute(__filename, async ({ logger, db }) => {
  const { limit = 500 } = program;
  let modifiedCount = 0;

  const cras = await getCrasStatutAge(db)(limit);

  try {
    const promises = [];
    cras.forEach(cra => {
      let age = { moins12ans: 0, de12a18ans: 0, de18a35ans: 0, de35a60ans: 0, plus60ans: 0 };
      let statut = { etudiant: 0, sansEmploi: 0, enEmploi: 0, retraite: 0, heterogene: 0 };

      switch (cra.cra.age) {
        case '-12':
          age.moins12ans = cra.cra.nbParticipants ?? 1;
          break;
        case '12-18':
          age.de12a18ans = cra.cra.nbParticipants ?? 1;
          break;
        case '18-35':
          age.de18a35ans = cra.cra.nbParticipants ?? 1;
          break;
        case '35-60':
          age.de35a60ans = cra.cra.nbParticipants ?? 1;
          break;
        case '+60':
          age.plus60ans = cra.cra.nbParticipants ?? 1;
          break;
        default:
          break;
      }
      switch (cra.cra.statut) {
        case 'etudiant':
          statut.etudiant = cra.cra.nbParticipants ?? 1;
          break;
        case 'sans emploi':
          statut.sansEmploi = cra.cra.nbParticipants ?? 1;
          break;
        case 'en emploi':
          statut.enEmploi = cra.cra.nbParticipants ?? 1;
          break;
        case 'retraite':
          statut.retraite = cra.cra.nbParticipants ?? 1;
          break;
        case 'heterogene':
          statut.heterogene = cra.cra.nbParticipants ?? 1;
          break;
        default:
          break;
      }
      promises.push(new Promise(async resolve => {
        updateCra(db)(cra._id, age, statut);
        modifiedCount++;
        resolve();
      }));
    });
    await Promise.all(promises);
  } catch (error) {
    logger.info(`Une erreur s'est produite lors de la mise à jour des CRAs`, error);
  }
  logger.info(`${modifiedCount} CRAs mis à jour`);
});
