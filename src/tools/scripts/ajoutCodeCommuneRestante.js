#!/usr/bin/env node
'use strict';

const { program } = require('commander');
const dayjs = require('dayjs');
const { execute } = require('../utils');

execute(__filename, async ({ db, logger, exit }) => {

  program.option('-c, --correction', 'correction: correction des cas restantes');
  program.option('-l, --log', 'log: rendre visible les logs');
  program.option('-a, --analyse', 'analyse: analyse des permaneces ok');
  program.option('-cp, --comparatif', 'comparatif: comparatif des permanences qui ont une incoherence');
  program.option('-i, --ignored', 'ignored: ignorer la partie de verification incoherence');
  program.helpOption('-e', 'HELP command');
  program.parse(process.argv);
  const { correction, log, analyse, comparatif, ignored } = program;
  let countError = 0;
  let countIncoherence = 0;
  let countPermsExists = 0;
  let countPermsNotExists = 0;
  let countMaj = 0;
  logger.info(`Stat : ${dayjs(new Date(), 'YYYY-MM-DDTh:mm A').toDate()}`);

  // eslint-disable-next-line max-len
  const idPermsInCrasSansCodeCommune = await db.collection('cras').distinct('permanence.$id', { 'cra.codeCommune': { '$exists': false }, 'permanence.$id': { '$exists': true } });
  const idsPermsSansCodeCommune = await db.collection('permanences').distinct('_id', { 'adresse.codeCommune': { '$exists': false } });
  const idsPermsTotal = await db.collection('permanences').distinct('_id');
  const idPermsInexistante = idPermsInCrasSansCodeCommune.map(i => String(i)).filter(i => !idsPermsTotal.map(i => String(i)).includes(i))?.length;

  logger.info(`${idsPermsSansCodeCommune.length} permanences restantes qui sont sans codeCommune`);
  logger.info(`${idPermsInCrasSansCodeCommune.length} permanences qui sont associés à aux moins 1 cras (qui n'ont pas de code Commune)`);
  logger.error(`${idPermsInexistante} permanence(s) potentiellement supprimer !`);

  for (const idPerm of idPermsInCrasSansCodeCommune) {
    const permanenceCorriger = await db.collection('permanences').findOne({ '_id': idPerm });
    const incoherenceNomCommune = await db.collection('cras').distinct('cra.nomCommune', { 'permanence.$id': idPerm });
    const incoherenceCodePostal = await db.collection('cras').distinct('cra.codePostal', { 'permanence.$id': idPerm });

    if (!permanenceCorriger?.adresse?.codeCommune) {
      if (log) {
        logger.error(`id : ${idPerm} ${permanenceCorriger?.adresse ? 'n\'a pas été corrigé' : 'n\'existe pas'}`);
      }
      if (permanenceCorriger?.adresse) {
        countPermsExists++;
      } else {
        countPermsNotExists++;
      }
      countError++;
    } else if (((incoherenceNomCommune.length >= 2) || (incoherenceCodePostal.length >= 2)) && !ignored) {
      if (log || comparatif) {
        logger.error(`Permanence id : ${idPerm} a des différences dans les cras ${incoherenceCodePostal} / ${incoherenceNomCommune}`);
      }
      countIncoherence++;
    } else if (correction) {
      const updateCras = await db.collection('cras').updateMany(
        { 'permanence.$id': idPerm },
        { '$set': {
          'cra.codePostal': permanenceCorriger?.adresse?.codePostal,
          'cra.nomCommune': permanenceCorriger?.adresse?.ville,
          'cra.codeCommune': permanenceCorriger?.adresse?.codeCommune,
        }
        });
      // eslint-disable-next-line max-len
      logger.info(`- ${idPerm} => ${incoherenceCodePostal[0]} ${incoherenceNomCommune[0]} / ${permanenceCorriger?.adresse?.codePostal} ${permanenceCorriger?.adresse?.ville} (${updateCras.modifiedCount} cras corrigés)`);
      countMaj++;
    } else {
      if (log || analyse) {
        // eslint-disable-next-line max-len
        logger.info(`- ${idPerm} => ${incoherenceCodePostal[0]} ${incoherenceNomCommune[0]} / ${permanenceCorriger?.adresse?.codePostal} ${permanenceCorriger?.adresse?.ville}`);
      }
      countMaj++;
    }
  }
  // eslint-disable-next-line max-len
  logger.info(`${countError} en erreurs dont ${countPermsExists} pas encore corrigés & ${countPermsNotExists} qui n'existe pas (${countError - countPermsNotExists} restante(s))`);
  logger.info(`${countIncoherence} incoherence(s)`);
  logger.info(`${countMaj} qui sont Ok`);
  exit();
});
