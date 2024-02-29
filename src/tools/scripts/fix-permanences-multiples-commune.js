#!/usr/bin/env node
'use strict';

const { program } = require('commander');
const dayjs = require('dayjs');
const { execute } = require('../utils');
const { ObjectId } = require('mongodb');

// node src/tools/scripts/fix-permanences-multiples-commune.js --analyse
// node src/tools/scripts/fix-permanences-multiples-commune.js --partie xxx -i xxx -cp xxx -v xxx -cm xxx
// node src/tools/scripts/fix-permanences-multiples-commune.js --partie xxx -i xxx -cp xxx -v xxx -cm xxx --correction

execute(__filename, async ({ db, logger, exit }) => {

  program.option('-c, --correction', 'correction: correction des cas restants');
  program.option('-p, --partie <partie>', 'log: modif ou sauvegarde');
  program.option('-a, --analyse', 'analyse: analyse des permanences not ok');
  program.option('-i, --permanence <permanence>', 'permanence: id permanence mongo');
  program.option('-v, --ville <ville>', 'ville');
  program.option('-cp, --codePostal <codePostal>', 'codePostal');
  program.option('-cm, --codeCommune <codeCommune>', 'codeCommune');
  program.helpOption('-e', 'HELP command');
  program.parse(process.argv);
  const { correction, partie, analyse, permanence, ville, codePostal, codeCommune } = program.opts();
  if (!analyse && !['modif', 'sauvegarde'].includes(partie)) {
    exit(`Veuilez choisir la partie modif ou sauvegarde`);
    return;
  }
  if (partie && (!permanence || !codePostal || !ville || !codeCommune)) {
    exit(`Veuillez ajouter un id Permanence ainsi que le codePostal, la ville et le codeCommune`);
    return;
  }
  logger.info(`Stat : ${dayjs(new Date(), 'YYYY-MM-DDTh:mm A').toDate()}`);
  const idPermanence = new ObjectId(permanence);
  // eslint-disable-next-line max-len
  const idPermsInCrasSansCodeCommune = await db.collection('cras').distinct('permanence.$id', { 'cra.codeCommune': { '$exists': false }, 'permanence.$id': { '$exists': true } });
  const idsPermsTotal = await db.collection('permanences').distinct('_id');
  const idPermsInexistante = idPermsInCrasSansCodeCommune.map(i => String(i)).filter(i => !idsPermsTotal.map(i => String(i)).includes(i))?.length;

  logger.info(`${idPermsInCrasSansCodeCommune.length} permanences qui sont associées à au moins 1 cras (qui n'ont pas de code Commune)`);
  logger.warn(`${idPermsInexistante} permanence(s) potentiellement supprimées !`);

  if (partie) {
    const countCrasPermanence =
      await db.collection('cras').countDocuments({ 'permanence.$id': idPermanence, 'cra.nomCommune': ville, 'cra.codePostal': codePostal });
    const getPermanence = await db.collection('permanences').findOne({ '_id': idPermanence });
    logger.info(`- ${permanence} actuelle => ${getPermanence.adresse.codePostal} ${getPermanence.adresse.ville}`);

    if (partie === 'modif') {
      logger.info(`Il y a ${countCrasPermanence} qui n'auront plus la permanence.$id (MODIF)`);
      if (correction) {
        await db.collection('cras').updateMany(
          { 'permanence.$id': idPermanence, 'cra.nomCommune': ville, 'cra.codePostal': codePostal },
          { $set: { 'permanence': null, 'cra.codeCommune': codeCommune } }
        );
      }
    }

    if (partie === 'sauvegarde') {
    // eslint-disable-next-line max-len
      logger.info(`Il y a ${countCrasPermanence} (${codePostal} ${ville} => ${getPermanence.adresse.codePostal} ${getPermanence.adresse.ville}) qui auront bien la permanence.$id (SAUVEGARDE)`);
      if (correction) {
        if (!getPermanence.adresse?.codeCommune) {
          await db.collection('permanences').updateOne(
            { '_id': idPermanence },
            { $set: { 'adresse.codeCommune': codeCommune } }
          );
        }
        await db.collection('cras').updateMany(
          { 'permanence.$id': idPermanence, 'cra.nomCommune': ville, 'cra.codePostal': codePostal },
          { $set: { 'cra.codeCommune': codeCommune, 'cra.codePostal': getPermanence.adresse.codePostal, 'cra.nomCommune': getPermanence.adresse.ville }
          });
      }
    }
  }
  if (analyse) {
    for (const idPerm of idPermsInCrasSansCodeCommune) {
      const permanenceCorriger = await db.collection('permanences').findOne({ '_id': idPerm });
      const incoherenceNomCommune = await db.collection('cras').distinct('cra.nomCommune', { 'permanence.$id': idPerm });
      const incoherenceCodePostal = await db.collection('cras').distinct('cra.codePostal', { 'permanence.$id': idPerm });
      const verificationDateCreateCras = await db.collection('cras').distinct('createdAt', { 'permanence.$id': idPerm });
      const verifDateUpdatePermanence = await db.collection('permanences').distinct('updatedAt', { '_id': idPerm });

      if (((incoherenceNomCommune.length >= 2) || (incoherenceCodePostal.length >= 2))) {
        logger.error(`Permanence id : ${idPerm} a des différences dans les cras ${incoherenceCodePostal} / ${incoherenceNomCommune}`);
      } else if ((verificationDateCreateCras[verificationDateCreateCras.length - 1] <= verifDateUpdatePermanence[0])) {
        // eslint-disable-next-line max-len
        logger.error(`- Vérification : perm ${idPerm} (${permanenceCorriger?.adresse?.codePostal} ${permanenceCorriger?.adresse?.ville}) vérification nescessaire côté cras ${incoherenceCodePostal} ${incoherenceNomCommune} => ${permanenceCorriger?.adresse?.codePostal} ${permanenceCorriger?.adresse?.ville}`);
      }
    }
  }
  logger.info('FIN du script');
  exit();
});
