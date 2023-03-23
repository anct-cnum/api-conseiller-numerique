#!/usr/bin/env node
'use strict';

const path = require('path');
const fs = require('fs');
const { execute } = require('../utils');
const axios = require('axios');
const codePostauxFichier = require('../../../data/imports/code-commune.json');
const { program } = require('commander');

const updatePermanenceAndCRAS = db => async (matchLocation, _id) => {
  await db.collection('permanences').updateOne({ _id },
    { '$set': {
      'adresse.numeroRue': matchLocation.numeroRue,
      'adresse.rue': matchLocation.rue,
      'codePostal': matchLocation.codePostal,
      'adresse.ville': matchLocation.ville,
      'adresse.codeCommuneInsee': matchLocation.codeCommuneInsee,
    }
    });
  await db.collection('cras').updateMany({ 'permanence.$id': _id },
    { '$set': {
      'cra.codePostal': matchLocation.codePostal,
      'cra.nomCommune': matchLocation.ville,
      'cra.codeCommuneInsee': matchLocation.codeCommuneInsee,
    }
    });
};
const statCras = async db => {
  const CrasRestantSansPerm = await db.collection('cras').countDocuments(
    { 'cra.codeCommuneInsee': { '$exists': false }, 'permanence.$id': { '$exists': false } }
  );
  const CrasRestantAvecPerm = await db.collection('cras').countDocuments(
    { 'cra.codeCommuneInsee': { '$exists': false }, 'permanence.$id': { '$exists': true } }
  );
  return { CrasRestantSansPerm, CrasRestantAvecPerm };
};
const formatText = mot => {
  let m = mot.normalize('NFD').replace(/[\u0300-\u036f]/g, '')?.replace(/[',-]/g, ' ');
  m = m.replace(/\bSAINT\b/gi, 'ST');
  m = m.replace(/\bSAINTE\b/gi, 'STE');
  return m;
};

const resultApi = obj => ({
  'numeroRue': obj?.housenumber ?? '',
  'rue': obj?.street ?? '',
  'codePostal': obj?.postcode,
  'ville': obj?.city.toUpperCase(),
  'codeCommuneInsee': obj?.citycode,
});

execute(__filename, async ({ logger, db, exit }) => {
  program.option('-l, --limit <limit>', 'limit: limit');
  program.option('-p, --partie <partie>', 'partie: cras ou permanences');
  program.option('-a, --acte <acte>', 'acte: correction');
  program.option('-lt, --lot <lot>', 'lot: numero lot');
  program.helpOption('-e', 'HELP command');
  program.parse(process.argv);

  const limit = ~~program.limit === 0 ? 1 : ~~program.limit;
  const { partie, lot, acte } = program;

  if (!['cras', 'permanences'].includes(partie)) { // ok
    exit(`Partie incorrect, veuillez choisir parmi la liste ['cras', 'permanences']`);
    return;
  } else if (!lot && partie === 'cras') { // ok
    exit(`Presciser numero lot pour la partie ${partie} ?`);
    return;
  } else {

    if (partie === 'cras') { // ok
      const statAvant = await statCras(db);
      let count = 0;
      logger.info(`${statAvant.CrasRestantAvecPerm} CRAS avec une permanence & ${statAvant.CrasRestantSansPerm} CRAS sans permanence (AVANT la correction) `);
      for (let obj of codePostauxFichier) {
        const correctionCras = await db.collection('cras').updateMany(
          { 'cra.codePostal': obj.Code_postal, 'cra.nomCommune': obj.Nom_commune, 'cra.codeCommuneInsee': { '$exists': false } },
          { '$set': { 'cra.codeCommuneInsee': obj.Code_Commune } });
        count += correctionCras?.modifiedCount;
      }
      logger.info(`${count} Cras corrigés aux total`);
      const statApres = await statCras(db);
      logger.info(`${statApres.CrasRestantAvecPerm} CRAS avec une permanence & ${statApres.CrasRestantSansPerm} CRAS sans permanence (APRES la correction) `);
    }
    if (partie === 'permanences') {
      logger.info(`Partie Permanences , par defaut la verification ${acte ? 'AVEC' : 'SANS'} correction`);
      const permanences =
      await db.collection('permanences').find({ 'adresse.codeCommuneInsee': { '$exists': false } }).limit(limit).project({ adresse: 1, location: 1 }).toArray();
      const exportsCSv = {
        permMatchOK: [],
        permNotOK: [],
        permError: [],
        diffCityAndCodePostal: [],
      };
      for (const { adresse, location, _id } of permanences) {
        const adresseCompile = `${adresse.numeroRue ?? ''} ${adresse.rue} ${adresse.codePostal} ${adresse.ville}`;
        const urlAPI = `https://api-adresse.data.gouv.fr/search/?q=${encodeURI(adresseCompile)}`;
        await axios.get(urlAPI, { params: {} }).then(async result => {
          // verif de la location avec l'adresse de la perm (saisi ou non)
          const matchLocation = result.data?.features.find(i => String(i?.geometry?.coordinates) === String(location?.coordinates));
          if (!matchLocation) {
            const resultQueryLatLong = await axios.get(`${urlAPI}&lat=${location?.coordinates[0]}&lon=${location?.coordinates[1]}`, { params: {} });
            exportsCSv.permNotOK.push({ // A rectif plus tard..
              _id,
              adresse: { ...adresse, coordinates: location?.coordinates },
              resultApi: {
                total: resultQueryLatLong.data?.features.length,
                fields: resultQueryLatLong.data?.features.map(i => resultApi(i.properties))
              } });
            return;
          } else if (formatText(matchLocation.properties.city.toUpperCase()) !== formatText(adresse.ville) ||
          matchLocation.properties.postcode !== adresse.codePostal || !matchLocation?.properties?.street) {
            exportsCSv.diffCityAndCodePostal.push({ _id, adresse,
              matchLocation: matchLocation?.properties?.street ? resultApi(matchLocation.properties) : matchLocation.properties });
          } else {
            exportsCSv.permMatchOK.push({ _id, adresse, matchOK: resultApi(matchLocation.properties) });
            if (acte === 'correction') {
              await updatePermanenceAndCRAS(db)(resultApi(matchLocation.properties), _id);
            }
          }
        }).catch(error =>
          exportsCSv.permError.push({ message: error.message, detail: adresseCompile }));
      }
      Object.keys(exportsCSv).forEach(function(key) {
        let jsonFile = path.join(__dirname, '../../../data/exports-historique', `${lot}Lot-${key}.json`);
        let file = fs.createWriteStream(jsonFile, { flags: 'w' });
        file.write(JSON.stringify([
          { total: exportsCSv[key].length, [key]: exportsCSv[key] },
        ]));
        logger.info(`${[key]}: ${exportsCSv[key].length}`);
      });
    }
    logger.info(`Fin du lot ${lot} pour la partie ${partie}`);
    exit();
  }
});
