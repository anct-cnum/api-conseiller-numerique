#!/usr/bin/env node
'use strict';

const { program } = require('commander');
const dayjs = require('dayjs');
const { execute } = require('../utils');
const axios = require('axios');

// node src/tools/scripts/fix-permanences-cn-non-corriger.js --analyse
// node src/tools/scripts/fix-permanences-cn-non-corriger.js --correction

execute(__filename, async ({ db, logger, exit }) => {

  program.option('-c, --correction', 'correction: correction des cas restants');
  program.option('-a, --analyse', 'analyse: analyse des permanences ok');
  program.option('-i, --ignored', 'ignored: ignorer la partie de verification incoherence');
  program.helpOption('-e', 'HELP command');
  program.parse(process.argv);

  const { correction, analyse, ignored } = program.opts();
  logger.info(`Stat : ${dayjs(new Date(), 'YYYY-MM-DDTh:mm A').toDate()}`);
  // eslint-disable-next-line max-len
  const idPermsInCrasSansCodeCommune = await db.collection('cras').distinct('permanence.$id', { 'cra.codeCommune': { '$exists': false }, 'permanence.$id': { '$exists': true } });
  // eslint-disable-next-line max-len
  const idsPermsSansCodeCommune = await db.collection('permanences').distinct('_id', { 'adresse.codeCommune': { '$exists': false } });
  const idsPermsTotal = await db.collection('permanences').distinct('_id');
  const idPermsInexistante = idPermsInCrasSansCodeCommune.map(i => String(i)).filter(i => !idsPermsTotal.map(i => String(i)).includes(i))?.length;

  logger.info(`${idsPermsSansCodeCommune.length} permanences restantes qui sont sans codeCommune`);
  logger.info(`${idPermsInCrasSansCodeCommune.length} permanences qui sont associées à au moins 1 cras (qui n'ont pas de code Commune)`);
  logger.warn(`${idPermsInexistante} permanence(s) potentiellement supprimer !`);
  let countOk = 0;

  for (const idPerm of idsPermsSansCodeCommune) {
    const permanenceSansCodeCommune = await db.collection('permanences').findOne({ '_id': idPerm });
    const incoherenceNomCommune = await db.collection('cras').distinct('cra.nomCommune', { 'permanence.$id': idPerm });
    const incoherenceCodePostal = await db.collection('cras').distinct('cra.codePostal', { 'permanence.$id': idPerm });
    const verificationDateCreateCras = await db.collection('cras').distinct('createdAt', { 'permanence.$id': idPerm });
    const verifDateUpdatePermanence = await db.collection('permanences').distinct('updatedAt', { '_id': idPerm });
    const countCras = await db.collection('cras').countDocuments({ 'permanence.$id': idPerm });

    const formatText = mot => mot?.normalize('NFD').replace(/[\u0300-\u036f]/g, '')?.replace(/['’,-]/g, ' ');
    const { ville, codePostal } = permanenceSansCodeCommune?.adresse ?? { ville: '', codePostal: '' };
    const params = {};
    const urlAPI = `https://geo.api.gouv.fr/communes?nom=${ville}&codePostal=${codePostal}&format=geojson&geometry=centre`;
    const { data } = await axios.get(urlAPI, { params: params });
    const features = data?.features.length >= 1 ? data?.features[0]?.properties : [];
    const miseAJour = {
      nomCommune: features?.nom?.toUpperCase(),
      codeCommune: features?.code,
      codeDepartement: features?.codeDepartement,
      codeRegion: features?.codeRegion,
      codePostal: features?.codesPostaux?.find(i => i === codePostal)
    };
    if (features.length === 0) {
      logger.warn(`- ${idPerm} => ${ville} ${codePostal} => 0 résultat (${countCras} cra(s) concerné(s))`);
    } else if (!features?.codesPostaux?.find(i => i === codePostal)) {
      // eslint-disable-next-line max-len
      logger.error(`- ${idPerm} => ${ville} ${codePostal} => le codePostal ne fait pas partie de la liste ${features?.codesPostaux} (${countCras} cra(s) concerné(s))`);
    } else if ((codePostal !== miseAJour.codePostal) || (formatText(ville) !== formatText(miseAJour.nomCommune))) {
      logger.error(`- ${idPerm} => ${ville} ${codePostal} => ${miseAJour.nomCommune} ${miseAJour.codePostal} (DIFFERENCE) (${countCras} cra(s) concerné(s))`);
    } else if (((incoherenceNomCommune.length >= 2) || (incoherenceCodePostal.length >= 2)) && !ignored) {
      logger.error(`- ${idPerm} a des différences dans les cras ${incoherenceCodePostal} / ${incoherenceNomCommune} (${countCras} cra(s) concerné(s))`);
    } else if ((verificationDateCreateCras[verificationDateCreateCras.length - 1] <= verifDateUpdatePermanence[0]) && !ignored) {
      // eslint-disable-next-line max-len
      logger.error(`- ${idPerm} vérification nescessaire côté cras => PERM (actuelle) ${codePostal} ${ville} => CRAS ${incoherenceCodePostal} ${incoherenceNomCommune} (${countCras} cra(s) concerné(s))`);
    } else if (correction) {
      await db.collection('permanences').updateOne(
        { '_id': idPerm },
        { '$set': {
          'adresse.codePostal': miseAJour.codePostal,
          'adresse.ville': miseAJour.nomCommune,
          'adresse.codeCommune': miseAJour.codeCommune,
        } });
      const updateCras = await db.collection('cras').updateMany(
        { 'permanence.$id': idPerm },
        { '$set': {
          'cra.codePostal': miseAJour.codePostal,
          'cra.nomCommune': miseAJour.nomCommune,
          'cra.codeCommune': miseAJour.codeCommune,
        } });
      // eslint-disable-next-line max-len
      logger.info(`- ${idPerm} => ${ville} ${codePostal} => ${miseAJour.nomCommune} ${miseAJour.codePostal} (${updateCras.modifiedCount} / ${countCras} cra(s) corrigés)`);
      countOk++;
    } else if (analyse) {
      logger.info(`- ${idPerm} => ${ville} ${codePostal} => ${miseAJour.nomCommune} ${miseAJour.codePostal} (${countCras} cra(s) concerné(s))`);
      countOk++;
    } else {
      countOk++;
    }
  }
  logger.info(`${countOk} qui sont OK / ${idsPermsSansCodeCommune.length - countOk} permanences en erreur`);
  exit();
});

