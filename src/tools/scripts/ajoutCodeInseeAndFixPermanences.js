#!/usr/bin/env node
'use strict';

const path = require('path');
const fs = require('fs');
const { execute } = require('../utils');
const axios = require('axios');
const codePostauxFichier = require('../../../data/imports/code-commune.json');
const codePostauxFichierCrasRestant = require('../../../data/imports/correction-cras-restante.json');
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
const updatePermanenceAndCRAS = db => async (logger, matchLocation, coordinates, _id) => {
  const incoherenceNomCommune = await db.collection('cras').distinct('cra.nomCommune', { 'permanence.$id': _id });
  const incoherenceCodePostal = await db.collection('cras').distinct('cra.codePostal', { 'permanence.$id': _id });
  if ((incoherenceNomCommune.length >= 2) || (incoherenceCodePostal.length >= 2)) {
    logger.error(`- Différences : perm ${_id} a des différences dans les cras ${incoherenceCodePostal} / ${incoherenceNomCommune}`);
    return;
  }
  const verificationDateCreateCras = await db.collection('cras').distinct('createdAt', { 'permanence.$id': _id });
  const verifDateUpdatePermanence = await db.collection('permanences').distinct('updatedAt', { '_id': _id });
  if (verificationDateCreateCras[verificationDateCreateCras.length - 1] <= verifDateUpdatePermanence[0]) {
    // eslint-disable-next-line max-len
    logger.error(`- Vérification : perm ${_id} vérification nescessaire côté cras ${incoherenceCodePostal} ${incoherenceNomCommune} => ${matchLocation.codePostal} ${matchLocation.ville}`);
    return;
  }
  // pas de update de numeroRue si dans l'api adresse => le numeroRue n'est pas présent
  const setPermanence = matchLocation.numeroRue !== '' ? { 'adresse.numeroRue': matchLocation.numeroRue } : {};
  await db.collection('permanences').updateOne({ _id },
    { '$set': {
      ...setPermanence,
      'adresse.rue': matchLocation.rue,
      'adresse.codePostal': matchLocation.codePostal,
      'adresse.ville': matchLocation.ville,
      'adresse.codeCommune': matchLocation.codeCommune,
      'location.coordinates': coordinates
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
const formatText = mot => mot?.normalize('NFD').replace(/[\u0300-\u036f]/g, '')?.replace(/['’,-]/g, ' ');
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
.replace(/\bCHE\b/gi, 'CHEMIN')
.replace(/\bCRS\b/gi, 'COURS')
.replace(/\bIMP\b/gi, 'IMPASSE')
.replace(/\bSQ\b/gi, 'SQUARE')
.replace(/\bNULL\b/gi, '')
.replace('.', '')
.replace('Œ', 'OE')
.trim();

const articleRue = rue => rue?.replace(/\bDU\b/gi, '')
.replace(/\bDE LA\b/gi, '')
.replace(/\bDE\b/gi, '')
.replace(/\bDES\b/gi, '')
.replace(/\bUN\b/gi, '')
.replace(/\bUNE\b/gi, '')
.replace(/\bLE\b/gi, '')
.replace(/\bLA\b/gi, '')
.replace(/\bLES\b/gi, '');

const resultApi = obj => ({
  'numeroRue': obj?.housenumber ?? '',
  'rue': obj?.street ?? obj?.locality,
  'codePostal': obj?.postcode,
  'ville': obj?.city?.toUpperCase(),
  'codeCommune': obj?.citycode,
});
const exportCsvPermanences = (exportsCSv, lot, logger) => {
  const exportCsvColonnes = [
    { label: 'permMatchOK', colonne: 'id permanence;Adresse permanence;matchOK\n' },
    // eslint-disable-next-line max-len
    { label: 'permNotOK', colonne: 'nombre CN;id permanence;Adresse permanence;nombre résultat Api adresse (query lat/lon); Resultat Api Adresse (query lat/lon)\n' },
    { label: 'diffCityAndCodePostal', colonne: 'nombre CN;total de diff;id permanence;Adresse permanence;Resultat Api Adresse;STATUT;TRIE\n' },
    { label: 'permError', colonne: 'id permanence;message;detail\n' },
    { label: 'adressesContact', colonne: 'id permanence;CN total in Permanence;Un Email CN;Raison\n' }
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
        file.write(`${i.cnfsCount};${i.nombreDiff};${i._id};${objectCsv(i.adresse)};${objectCsv(i.matchLocation)};${i.statut};${i.raison}\n`);
        return;
      }
      if (key === 'adressesContact') {
        file.write(`${i._id};${i.cnfsCount};${i.emailCN};${i.raison}\n`);
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
  program.option('-f, --fichier <fichier>', 'fichier: choix 1 : tous les codes postaux ou 2: fichier personnalisé');
  program.option('-a, --acte <acte>', 'acte: correction');
  program.option('-lt, --lot <lot>', 'lot: numero lot');
  program.helpOption('-e', 'HELP command');
  program.parse(process.argv);

  const limit = ~~program.limit === 0 ? 1 : ~~program.limit;
  const { partie, lot, acte, fichier } = program;

  if (!['cras', 'permanences'].includes(partie)) {
    exit(`Partie incorrecte, veuillez choisir parmi la liste ['cras', 'permanences']`);
    return;
  }
  if (!lot && partie === 'permanences') {
    exit(`Préciser numéro de lot pour la partie ${partie} ?`);
    return;
  }
  if (!fichier && partie === 'cras' || !['1', '2'].includes(fichier)) {
    exit(`Veuillez choisir 1 (code postaux à jour) ou 2 (code postaux restant) ?`);
    return;
  }

  if (partie === 'cras') {
    const statAvant = await statCras(db);
    let count = 0;
    logger.info(`${statAvant.crasRestantAvecPerm} CRAS avec une permanence & ${statAvant.crasRestantSansPerm} CRAS sans permanence (AVANT la correction) `);
    const fichierCodePostaux = fichier === '1' ? codePostauxFichier : codePostauxFichierCrasRestant;
    for (let obj of fichierCodePostaux) {
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
    const permanences = await db.collection('permanences').find({
      'adresse.codeCommune': { '$exists': false }
    }).limit(limit).project({ adresse: 1, location: 1, conseillers: 1 }).toArray();
    const exportsCSv = {
      permMatchOK: [],
      permNotOK: [],
      permError: [],
      diffCityAndCodePostal: [],
      adressesContact: []
    };
    logger.info(`Permanences au total: ${permanences.length}`);
    const countApiNotHouseNumber = [];
    for (const { adresse, location, conseillers, _id } of permanences) {
      const adresseComplete = `${adresse?.numeroRue ?? ''} ${adresse?.rue} ${adresse?.codePostal} ${adresse?.ville}`;
      const urlAPI = `https://api-adresse.data.gouv.fr/search/?q=${encodeURI(adresseComplete)}`;
      await axios.get(urlAPI, { params: {} }).then(async result => {
        let resultQueryLatLong = {};
        let matchLocation = result?.data?.features?.find(i => String(i?.geometry?.coordinates) === String(location?.coordinates));
        if (!matchLocation) {
          resultQueryLatLong = await axios.get(`${urlAPI}&lon=${location?.coordinates[0]}&lat=${location?.coordinates[1]}`, { params: {} });
          matchLocation = resultQueryLatLong?.data?.features?.find(i => String(i?.geometry?.coordinates) === String(location?.coordinates));
        }
        const district = matchLocation?.properties?.district ? matchLocation?.properties?.district?.replace('e Arrondissement', '') : undefined;
        const comparLatLon = resultQueryLatLong?.data?.features.filter(i => i?.geometry?.coordinates[0].toFixed(1) === location?.coordinates[0].toFixed(1) &&
          i?.geometry?.coordinates[1].toFixed(1) === location?.coordinates[1].toFixed(1));
        if (!matchLocation && comparLatLon?.length === 1) {
          matchLocation = comparLatLon[0];
        }
        if (!matchLocation) {
          // non compare du numero de rue, objectif trouver parmi X resultats , une adresse qui correspond à la perm
          const permanenceSansNumRue = `${adresse?.rue} ${adresse?.codePostal} ${adresse?.ville?.replace('e Arrondissement', '')?.split(' ')[0]}`;
          const apiAdresse = e => `${e?.rue} ${e?.codePostal} ${e?.ville}`;
          const permanence = adressePerm(formatText(permanenceSansNumRue)?.toUpperCase());
          const api = e => adressePerm(formatText(apiAdresse(resultApi(e.properties))?.toUpperCase()));
          matchLocation = resultQueryLatLong?.data?.features?.find(e => api(e) === permanence);
        }
        if (!matchLocation) {
          const emailConseillers = conseillers[0] ? await db.collection('users').findOne({ 'entity.$id': conseillers[0] }) : '';
          exportsCSv.permNotOK.push({ _id,
            adresse: { ...adresse, coordinates: location?.coordinates },
            resultApi: {
              total: resultQueryLatLong?.data?.features?.length,
              fields: resultQueryLatLong?.data?.features?.map(i => ({ ...resultApi(i.properties), coordinates: i.geometry.coordinates }))
            },
            cnfsCount: conseillers?.length,
            emailCN: conseillers
          });
          exportsCSv.adressesContact.push({
            _id,
            cnfsCount: conseillers?.length,
            raison: 'MULTIPLE RESULTAT',
            emailCN: emailConseillers?.name ?? ''
          });
          return;
        }
        const adresseControleDiff = {
          // eslint-disable-next-line max-len
          diffNumber: matchLocation?.properties?.housenumber?.toUpperCase() !== (adresse?.numeroRue?.toUpperCase())?.replace(' BIS', 'BIS') && ![null, '', 'null'].includes(adresse?.numeroRue),
          // eslint-disable-next-line max-len
          diffRue: articleRue(formatText(matchLocation?.properties?.street ?? matchLocation?.properties?.locality)?.toUpperCase()) !== articleRue(adressePerm(formatText(adresse.rue)?.toUpperCase())),
          diffCodePostal: matchLocation?.properties?.postcode?.toUpperCase() !== adresse?.codePostal?.toUpperCase(),
          diffville: formatText(district)?.toUpperCase() !== adressePerm(formatText(adresse.ville)?.toUpperCase()) &&
          adressePerm(formatText(matchLocation?.properties?.city)?.toUpperCase()) !== adressePerm(formatText(adresse.ville)?.toUpperCase())
        };
        if (adresseControleDiff?.diffRue === true) {// gérer le cas où l'api adresse à des nom "raccourdie" "bd ou Pl etc..."
          // eslint-disable-next-line max-len
          adresseControleDiff.diffRue = articleRue(adressePerm(formatText(matchLocation?.properties?.street ?? matchLocation?.properties?.locality)?.toUpperCase())) !== articleRue(adressePerm(formatText(adresse.rue)?.toUpperCase()));
        }
        if (adresseControleDiff?.diffville === true) {// dans le cas où "SAINT" est écrit entièrement pour la ville
          adresseControleDiff.diffville = formatText(district)?.toUpperCase() !== formatText(adresse.ville)?.toUpperCase() &&
          formatText(matchLocation?.properties?.city)?.toUpperCase() !== formatText(adresse.ville)?.toUpperCase();
          if (adresseControleDiff?.diffville === true) {
            // eslint-disable-next-line max-len
            adresseControleDiff.diffville = ![formatText(district)?.split(' ')[0]?.toUpperCase(), formatText(matchLocation?.properties?.city)?.toUpperCase()].includes(formatText(adresse.ville)?.split(' ')[0]?.toUpperCase());
          }
        }
        if (adresseControleDiff?.diffNumber === true) {// ignorer le cas il y a la perm avec un numéro de rue et dans le résultat api, il y en a pas.
          adresseControleDiff.diffNumber = ![null, '', 'null'].includes(adresse?.numeroRue) && adresse?.numeroRue?.length <= 8 ?
            !(!matchLocation?.properties?.housenumber && ![null, '', 'null'].includes(adresse?.numeroRue)) : adresseControleDiff.diffNumber;
          if (adresseControleDiff?.diffNumber === false) {
            countApiNotHouseNumber.push('Api sans numero rue');
          }
        }
        if (Object.values(adresseControleDiff).includes(true)) {
          const emailConseillers = conseillers[0] ? await db.collection('users').findOne({ 'entity.$id': conseillers[0] }) : '';
          const raisonLabel = {
            0: 'NUMERORUEDIFF',
            1: 'RUEDIFF',
            2: 'CODEPOSTALDIFF',
            3: 'VILLEDIFF'
          };
          const raisonIndexOf = raisonLabel[Object.values(adresseControleDiff).indexOf(true)];
          exportsCSv.diffCityAndCodePostal.push({
            statut: [adresseControleDiff.diffCodePostal, adresseControleDiff.diffville, adresseControleDiff.diffNumber].includes(true) ? 'MAJEUR' : 'AUTRE',
            nombreDiff: Object.values(adresseControleDiff).filter(i => i === true).length,
            _id,
            adresse,
            matchLocation: resultApi(matchLocation.properties),
            cnfsCount: conseillers?.length,
            raison: conseillers?.length === 1 ? raisonIndexOf : 'MULTIPLEDIFF',
          });
          exportsCSv.adressesContact.push({
            _id,
            cnfsCount: conseillers?.length,
            raison: conseillers?.length === 1 ? raisonIndexOf : 'MULTIPLEDIFF',
            emailCN: emailConseillers?.name ?? ''
          });
        } else {
          exportsCSv.permMatchOK.push({ _id, adresse, matchOK: resultApi(matchLocation?.properties) });
          if (acte === 'correction') {
            await updatePermanenceAndCRAS(db)(logger, resultApi(matchLocation?.properties), matchLocation?.geometry?.coordinates, _id);
          }
        }
      }).catch(error =>
        exportsCSv.permError.push({ _id, message: error.message, detail: adresseComplete }));
    }
    logger.info(`Permanence avec un numeroRue contrairement au résultat Api adresse: ${countApiNotHouseNumber.length}`);
    await exportCsvPermanences(exportsCSv, lot, logger);
  }
  logger.info(`Fin du lot ${lot} pour la partie ${partie}`);
  exit();
});
