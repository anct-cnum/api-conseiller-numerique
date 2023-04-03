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
const updatePermanenceAndCRAS = db => async (matchLocation, coordinates, _id) => {
  console.log('matchLocation:', coordinates);
  await db.collection('permanences').updateOne({ _id },
    { '$set': {
      'adresse.numeroRue': matchLocation.numeroRue,
      'adresse.rue': matchLocation.rue,
      'adresse.ville': matchLocation.ville,
      'adresse.codeCommune': matchLocation.codeCommune,
      'location': coordinates
    }
    });
  await db.collection('cras').updateMany({ 'permanence.$id': _id },
    { '$set': {
      'cra.nomCommune': matchLocation.ville,
      'cra.codeCommune': matchLocation.codeCommune,
    }
    });
};
const formatText = mot => mot?.normalize('NFD').replace(/[\u0300-\u036f]/g, '')?.replace(/[',-]/g, ' ');
const adressePerm = rue => rue?.replace(/\bST\b/gi, 'SAINT')
.replace(/\bSTE\b/gi, 'SAINTE')
.replace(/\bBD\b/gi, 'BOULEVARD')
.replace(/\bPL\b/gi, 'PLACE')
.replace(/\bALL\b/gi, 'ALLEE')
.replace(/\bAV\b/gi, 'AVENUE')
.replace(/\bAV.\b/gi, 'AVENUE')
.replace(/\bPL.\b/gi, 'PLACE')
.replace(/\bPL\b/gi, 'PLACE')
.replace(/\bRTE\b/gi, 'ROUTE')
.replace(/\bDR\b/gi, 'DOCTEUR')
.replace(/\bNULL\b/gi, '')
.trim();

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
    // eslint-disable-next-line max-len
    { label: 'permNotOK', colonne: 'nombre CN;id permanence;Adresse permanence;nombre résultat Api adresse (query lat/lon); Resultat Api Adresse (query lat/lon)\n' },
    { label: 'diffCityAndCodePostal', colonne: 'nombre CN;total de diff;id permanence;Adresse permanence;Resultat Api Adresse\n' },
    { label: 'permError', colonne: 'id permanence;message;detail\n' },
  ];
  const objectCsv = obj => `${obj?.numeroRue} ${obj?.rue} ${obj?.codePostal} ${obj?.ville}`;
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
        file.write(`${i.cnfsCount};${i._id};${objectCsv(i.adresse)}[${i.adresse.coordinates}];${i.resultApi?.total};${i.resultApi.fields.map(i => `${objectCsv(i)}[${i.coordinates}]`)}\n`);
        return;
      }
      if (key === 'diffCityAndCodePostal') {
        file.write(`${i.cnfsCount};${i.nombreDiff};${i._id};${objectCsv(i.adresse)};${objectCsv(i.matchLocation)}\n`);
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
  if (!lot && partie === 'permanences') {
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
    const permanences = await db.collection('permanences').find({ 'adresse.codeCommune': { '$exists': false } }).limit(limit).project({ adresse: 1, location: 1, conseillers: 1 }).toArray();
    const exportsCSv = {
      permMatchOK: [],
      permNotOK: [],
      permError: [],
      diffCityAndCodePostal: [],
    };
    for (const { adresse, location, conseillers, _id } of permanences) {
      const adresseComplete = `${adresse?.numeroRue ?? ''} ${adresse?.rue} ${adresse?.codePostal} ${adresse?.ville}`;
      const urlAPI = `https://api-adresse.data.gouv.fr/search/?q=${encodeURI(adresseComplete)}`;
      await axios.get(urlAPI, { params: {} }).then(async result => {
        let resultQueryLatLong = {};
        let matchLocation = result?.data?.features.find(i => String(i?.geometry?.coordinates) === String(location?.coordinates));
        if (!matchLocation) {
          resultQueryLatLong = await axios.get(`${urlAPI}&lat=${location?.coordinates[0]}&lon=${location?.coordinates[1]}`, { params: {} });
          matchLocation = resultQueryLatLong?.data?.features?.find(i => String(i?.geometry?.coordinates) === String(location?.coordinates));
        }
        const district = matchLocation?.properties?.district ? matchLocation?.properties?.district?.replace('e Arrondissement', '') : undefined;
        const comparLatLon = resultQueryLatLong?.data?.features.find(i => i?.geometry?.coordinates[0].toFixed(1) === location?.coordinates[0].toFixed(1) &&
          i?.geometry?.coordinates[1].toFixed(1) === location?.coordinates[1].toFixed(1));
        if (!matchLocation && resultQueryLatLong?.data?.features?.length === 1 && comparLatLon) {
          matchLocation = comparLatLon;
        }
        const adresseControleDiff = {
          // eslint-disable-next-line max-len
          diffNumber: matchLocation?.properties?.housenumber?.toUpperCase() !== adresse?.numeroRue?.toUpperCase() && ![null, '', 'null'].includes(adresse?.numeroRue),
          // eslint-disable-next-line max-len
          diffRue: formatText(matchLocation?.properties?.street ?? matchLocation?.properties?.locality)?.toUpperCase() !== adressePerm(formatText(adresse.rue)?.toUpperCase()),
          diffCodePostal: matchLocation?.properties?.postcode.toUpperCase() !== adresse?.codePostal.toUpperCase(),
          diffville: formatText(district)?.toUpperCase() !== adressePerm(formatText(adresse.ville))?.toUpperCase() &&
          formatText(matchLocation?.properties?.city)?.toUpperCase() !== adressePerm(formatText(adresse.ville))?.toUpperCase()
        };
        if (adresseControleDiff?.diffville === true) {// dans le cas où "SAINT" est écrit entièrement pour la ville
          adresseControleDiff.diffville = formatText(district)?.toUpperCase() !== formatText(adresse.ville)?.toUpperCase() &&
          formatText(matchLocation?.properties?.city)?.toUpperCase() !== formatText(adresse.ville)?.toUpperCase();
        }
        if (!matchLocation) {
          exportsCSv.permNotOK.push({ _id,
            adresse: { ...adresse, coordinates: location?.coordinates },
            resultApi: {
              total: resultQueryLatLong?.data?.features?.length,
              fields: resultQueryLatLong?.data?.features?.map(i => ({ ...resultApi(i.properties), coordinates: i.geometry.coordinates }))
            },
            cnfsCount: conseillers?.length
          });
        } else if (Object.values(adresseControleDiff).includes(true)) {
          exportsCSv.diffCityAndCodePostal.push({
            nombreDiff: Object.values(adresseControleDiff).filter(i => i === true).length,
            _id,
            adresse,
            matchLocation: resultApi(matchLocation.properties),
            cnfsCount: conseillers?.length
          });
        } else {
          exportsCSv.permMatchOK.push({ _id, adresse, matchOK: resultApi(matchLocation?.properties) });
          if (acte === 'correction') {
            await updatePermanenceAndCRAS(db)(resultApi(matchLocation?.properties), matchLocation?.geometry?.coordinates, _id);
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
