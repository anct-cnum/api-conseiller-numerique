#!/usr/bin/env node
'use strict';

const path = require('path');
const fs = require('fs');
const { execute } = require('../utils');
const axios = require('axios');
const codePostauxFichier = require('../../../data/imports/code-commune.json');
const { program } = require('commander');

const statCras = async db => {
  const crasRestantSansPerm = await db.collection('cras').countDocuments(
    { 'cra.codeCommune': { '$exists': false }, 'permanence.$id': { '$exists': false } }
  );
  const crasRestantAvecPerm = await db.collection('cras').countDocuments(
    { 'cra.codeCommune': { '$exists': false }, 'permanence.$id': { '$exists': true } }
  );
  return { crasRestantSansPerm, crasRestantAvecPerm };
};
const updatePermanenceAndCRAS = db => async (matchLocation, _id) => {
  await db.collection('permanences').updateOne({ _id },
    { '$set': {
      'adresse.numeroRue': matchLocation.numeroRue,
      'adresse.rue': matchLocation.rue,
      'codePostal': matchLocation.codePostal,
      'adresse.ville': matchLocation.ville,
      'adresse.codeCommune': matchLocation.codeCommune,
    }
    });
  await db.collection('cras').updateMany({ 'permanence.$id': _id },
    { '$set': {
      'cra.codePostal': matchLocation.codePostal,
      'cra.nomCommune': matchLocation.ville,
      'cra.codeCommune': matchLocation.codeCommune,
    }
    });
};
const formatText = mot => mot?.normalize('NFD').replace(/[\u0300-\u036f]/g, '')?.replace(/[',-]/g, ' ');
const resultApi = obj => ({
  'numeroRue': obj?.housenumber ?? '',
  'rue': obj?.street ?? obj?.locality,
  'codePostal': obj?.postcode,
  'ville': obj?.city.toUpperCase(),
  'codeCommune': obj?.citycode,
});
const exportCsvPermanences = (exportsCSv, lot, logger) => {
  const exportCsvColonnes = [
    { label: 'permMatchOK', colonne: 'id permanence;Adresse permanence;matchOK\n' },
    { label: 'permNotOK', colonne: 'id permanence;Adresse permanence;nombre résultat Api adresse (query lat/lon); Resultat Api Adresse (query lat/lon)\n' },
    { label: 'diffCityAndCodePostal', colonne: 'total de diff;id permanence;Adresse permanence;Resultat Api Adresse\n' },
    { label: 'permError', colonne: 'id permanence;message;detail\n' },
  ];
  const objectCsv = obj => `${obj.numeroRue} ${obj.rue} ${obj.codePostal} ${obj.ville}`;
  Object.keys(exportsCSv).forEach(function(key) {
    let csvFile = path.join(__dirname, '../../../data/exports-historique', `${lot}Lot-${key}.csv`);
    let file = fs.createWriteStream(csvFile, { flags: 'w' });
    file.write(exportCsvColonnes.find(i => i.label === key).colonne);
    exportsCSv[key].forEach(i => {
      if (key === 'permMatchOK') {
        file.write(`${i._id};${objectCsv(i.adresse)};${objectCsv(i.matchOK)}\n`);
        return;
      }
      if (key === 'permNotOK') {
        // eslint-disable-next-line max-len
        file.write(`${i._id};${objectCsv(i.adresse)}[${i.adresse.coordinates}];${i.resultApi?.total};${i.resultApi.fields.map(i => `${objectCsv(i)}[${i.coordinates}]`)}\n`);
        return;
      }
      if (key === 'diffCityAndCodePostal') {
        file.write(`${i.nombreDiff};${i._id};${objectCsv(i.adresse)};${objectCsv(i.matchLocation)}\n`);
        return;
      }
      file.write(`${i._id};${i.message};${i.detail}\n`);
    });
    logger.info(`${[key]}: ${exportsCSv[key].length}`);
  });
};

execute(__filename, async ({ logger, db, exit }) => {
  program.option('-l, --limit <limit>', 'limit: limit');
  program.option('-p, --partie <partie>', 'partie: cras ou permanences');
  program.option('-a, --acte <acte>', 'acte: correction');
  program.option('-lt, --lot <lot>', 'lot: numero lot');
  program.helpOption('-e', 'HELP command');
  program.parse(process.argv);

  const limit = ~~program.limit === 0 ? 1 : ~~program.limit;
  const { partie, lot, acte } = program;

  if (!['cras', 'permanences'].includes(partie)) {
    exit(`Partie incorrecte, veuillez choisir parmi la liste ['cras', 'permanences']`);
    return;
  }
  if (!lot && partie === 'cras') {
    exit(`Préciser numéro de lot pour la partie ${partie} ?`);
    return;
  }

  if (partie === 'cras') {
    const statAvant = await statCras(db);
    let count = 0;
    logger.info(`${statAvant.crasRestantAvecPerm} CRAS avec une permanence & ${statAvant.crasRestantSansPerm} CRAS sans permanence (AVANT la correction) `);
    for (let obj of codePostauxFichier) {
      const correctionCras = await db.collection('cras').updateMany(
        { 'cra.codePostal': obj.Code_postal, 'cra.nomCommune': obj.Nom_commune, 'cra.codeCommune': { '$exists': false } },
        { '$set': { 'cra.codeCommune': obj.Code_Commune } });
      count += correctionCras?.modifiedCount;
    }
    logger.info(`${count} Cras corrigés aux total`);
    const statApres = await statCras(db);
    logger.info(`${statApres.crasRestantAvecPerm} CRAS avec une permanence & ${statApres.crasRestantSansPerm} CRAS sans permanence (APRES la correction) `);
  }
  if (partie === 'permanences') {
    logger.info(`Partie Permanences , par défaut la vérification ${acte ? 'AVEC' : 'SANS'} correction`);
    // eslint-disable-next-line max-len
    const permanences = await db.collection('permanences').find({ 'adresse.codeCommune': { '$exists': false } }).limit(limit).project({ adresse: 1, location: 1 }).toArray();
    const exportsCSv = {
      permMatchOK: [],
      permNotOK: [],
      permError: [],
      diffCityAndCodePostal: [],
    };
    for (const { adresse, location, _id } of permanences) {
      const adresseComplete = `${adresse.numeroRue ?? ''} ${adresse.rue} ${adresse.codePostal} ${adresse.ville}`;
      const urlAPI = `https://api-adresse.data.gouv.fr/search/?q=${encodeURI(adresseComplete)}`;
      let resultQueryLatLong = {};
      await axios.get(urlAPI, { params: {} }).then(async result => {
        let matchLocation = result?.data?.features.find(i => String(i?.geometry?.coordinates) === String(location?.coordinates));
        if (!matchLocation) {
          resultQueryLatLong = await axios.get(`${urlAPI}&lat=${location?.coordinates[0]}&lon=${location?.coordinates[1]}`, { params: {} });
          matchLocation = resultQueryLatLong?.data?.features?.find(i => String(i?.geometry?.coordinates) === String(location?.coordinates));
        }
        const district = matchLocation?.properties?.district ? matchLocation?.properties?.district?.replace('e Arrondissement', '') : undefined;
        const adresseControleDiff = {
          diffNumber: matchLocation?.properties?.housenumber !== adresse.numeroRue && ![null, ''].includes(adresse.numeroRue),
          // eslint-disable-next-line max-len
          diffRue: formatText(matchLocation?.properties?.street ?? matchLocation?.properties?.locality)?.toUpperCase() !== formatText(adresse.rue)?.toUpperCase(),
          diffCodePostal: matchLocation?.properties?.postcode !== adresse.codePostal,
          diffville: formatText(district ?? matchLocation?.properties?.city.toUpperCase())?.toUpperCase() !== formatText(adresse.ville)
        };
        if (!matchLocation) {
          exportsCSv.permNotOK.push({ _id,
            adresse: { ...adresse, coordinates: location?.coordinates },
            resultApi: {
              total: resultQueryLatLong?.data?.features?.length,
              fields: resultQueryLatLong?.data?.features?.map(i => ({ ...resultApi(i.properties), coordinates: i.geometry.coordinates }))
            } });
        } else if (Object.values(adresseControleDiff).includes(true)) {
          exportsCSv.diffCityAndCodePostal.push({
            nombreDiff: Object.values(adresseControleDiff).filter(i => i === true).length,
            _id,
            adresse,
            matchLocation: resultApi(matchLocation.properties)
          });
        } else {
          exportsCSv.permMatchOK.push({ _id, adresse, matchOK: resultApi(matchLocation.properties) });
          if (acte === 'correction') {
            await updatePermanenceAndCRAS(db)(resultApi(matchLocation.properties), _id);
          }
        }
      }).catch(error =>
        exportsCSv.permError.push({ _id, message: error.message, detail: adresseComplete }));
    }
    await exportCsvPermanences(exportsCSv, lot, logger);
  }
  logger.info(`Fin du lot ${lot} pour la partie ${partie}`);
  exit();
});
