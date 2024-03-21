#!/usr/bin/env node
'use strict';

// node src\tools\exports\pqr-one-departement.js --departement XX -d

const path = require('path');
const { program } = require('commander');
const fs = require('fs');
const { ObjectId } = require('mongodb');
const { formatOpeningHours } = require('../../services/conseillers/common');
const { execute } = require('../utils');
const departements = require('../../../data/imports/departements-region.json');
const toms = require('../../../data/imports/tom.json');
const dayjs = require('dayjs');
const deps = new Map();

for (const value of departements) {
  deps.set(String(value.num_dep), value);
}


function cleanPhoneNumber(number) {
  let cleaned = number.replace(/\D/g, '');

  if (cleaned.startsWith('33') && cleaned.length === 11) {
    cleaned = '0' + cleaned.substring(2);
  } else if (cleaned.length === 12) { // Pour les DOM comme +590590478535
    cleaned = '0' + cleaned.substring(3);
  }

  return `${cleaned.substring(0, 2)}${cleaned.substring(2, 4)}${cleaned.substring(4, 6)}${cleaned.substring(6, 8)}${cleaned.substring(8, 10)}`;
}

program.description('Export liste CNFS pour carto txt')
.option('-dpt, --departement <departement>', 'departement: code departement')
.option('-d, --date <date>', 'date : YYYY-MM-DD')
.helpOption('-e', 'HELP command')
.parse(process.argv);

const uniformiseAdresse = a =>
  a?.replace(/avenue/gi, 'av.')
  .replace(/av /gi, 'av. ')
  .replace(/pl /gi, 'pl. ')
  .replace(/allée/gi, 'all.')
  .replace(/all /gi, 'all. ')
  .replace(/boulevard/gi, 'blvd')
  .replace(/bd /gi, 'blvd. ')
  .replace(/grd/gi, 'grand')
  .replace(/Rue /gi, 'rue ')
  .replace(/null /gi, '')
;

Object.assign(String.prototype, {
  removeSpacesParentheses() {
    return this?.replace(/\(\s+/gi, '(')
    .replace(/\s+\)/gi, ')');
  },
  fixSpaces() {
    return this?.replace(/\(\s+/gi, ' ')
    .replace(/\s+\)/gi, ')');
  }
});

const sortByNomSA = (a, b) => {
  if (!a.properties.name || !b.properties.name) {
    return;
  }
  return a.properties.name.localeCompare(b.properties.name, 'fr', { sensitivity: 'base' });
};

const sortByVille = (a, b) => {
  if (!a.properties.addressParts.ville || !b.properties.addressParts.ville) {
    return;
  }
  return a.properties.addressParts.ville.localeCompare(b.properties.addressParts.ville, 'fr', { sensitivity: 'base' });
};

const addressGroupSeparator = ' ';
const addressPartSeparator = ', ';

execute(__filename, async ({ logger, db, exit }) => {
  const options = program.opts();
  const getPermanencesByConseiller = async conseillerId => {
    return await db.collection('permanences').find({ 'conseillers': { '$in': [new ObjectId(conseillerId)] } }).toArray();
  };

  const getPermanencePrincipaleByConseiller = async conseillerId => {
    return await db.collection('permanences').findOne({ 'lieuPrincipalPour': { '$in': [new ObjectId(conseillerId)] } });
  };

  const removeNull = addressPart => addressPart.replace(/null/g, '');

  const isValidAddressPart = addressPart => addressPart !== undefined && addressPart !== null && addressPart.trim() !== '';

  const addressGroup = addressParts => addressParts.filter(isValidAddressPart).map(removeNull).join(addressGroupSeparator);

  const formatAddressFromPermanence = adresse => [
    addressGroup([
      adresse.numeroRue,
      uniformiseAdresse(adresse.rue)
    ])
  ].filter(isValidAddressPart).join(addressPartSeparator);

  const getGeometry = structure =>
    structure.coordonneesInsee ?
      { ...structure.coordonneesInsee } :
      { ...structure.location };

  // c : conseiller
  // p : permanence
  const toGeoJsonFromPermanence = (c, p) => ({
    type: 'Feature',
    geometry: p.location,
    properties: {
      id: p._id.toString(),
      nom: c.nom,
      prenom: c.prenom,
      telephone: p.numeroTelephone ? cleanPhoneNumber(p.numeroTelephone) : '',
      address: formatAddressFromPermanence(p.adresse),
      addressParts: {
        numeroRue: p.adresse.numeroRue,
        rue: p.adresse.rue,
        codePostal: p.adresse.codePostal,
        ville: p.adresse.ville,
      },
      name: p.nomEnseigne,
      openingHours: formatOpeningHours(p.horaires)
    }
  });

  const toGeoJsonFromStructure = s => ({
    type: 'Feature',
    geometry: getGeometry(s),
    properties: {
      id: s._id.toString(),
      nom: '',
      prenom: '',
      telephone: '',
      // eslint-disable-next-line max-len
      address: uniformiseAdresse(s?.adresseInsee2Ban?.name ?? `${s?.insee?.adresse?.numero_voie} ${s?.insee?.adresse?.type_voie} ${s?.insee?.adresse?.libelle_voie}`),
      addressParts: {
        numeroRue: s?.adresseInsee2Ban?.housenumber ?? s?.insee?.adresse?.numero_voie,
        rue: s?.adresseInsee2Ban?.street ?? `${s?.insee?.adresse?.type_voie} ${s?.insee?.adresse?.libelle_voie}`,
        codePostal: s?.adresseInsee2Ban?.postcode ?? s?.insee?.adresse?.code_postal,
        ville: s?.adresseInsee2Ban?.city ?? s?.insee?.adresse?.libelle_commune,
      },
      name: s.nom,
    }
  });

  const codePostal2departementRegion = (cp, codeCommune) => {
    if (!/^.{5}$/.test(cp)) {
      return null;
    }
    let dep;
    if (options.departement === '00') {
      // TOM
      const resultTom = toms.find(i => i.tom_com === codeCommune.substring(0, 3));
      return resultTom ? { num_dep: options.departement, dep_name: resultTom.tom_name, region_name: resultTom.tom_name } : null;
    } else if ((dep = cp.match(/^9[78]\d/))) {
      // DOM
      return deps.get(dep[0]);
    } else if ((dep = cp.match(/^20\d/))) {
      if (['200', '201'].includes(dep[0])) {
        // Corse du sud
        return deps.get('2A');
      }
      if (['202', '206'].includes(dep[0])) {
        // Haute Corse
        return deps.get('2B');
      }
    } else if ((dep = cp.match(/^\d\d/))) {
      // Le reste
      return deps.get(String(dep[0]));
    }
    return null;
  };

  const checkDiffDepartement = (codeDepartementInsee2Ban, codeCommuneInsee2Ban, structure) => {
    const value = structure?.codeCom ? 3 : 2; // 3 pour les Toms et 2 pour le reste
    const codeDepInsee = codeDepartementInsee2Ban?.substring(0, value);
    const codeCommuneInsee = codeCommuneInsee2Ban?.substring(0, value);
    const codeDepartementSA = structure?.codeDepartement;
    if ([codeDepInsee, codeCommuneInsee].includes(codeDepartementSA)) { // check de codeCommuneInsee est utile pour la corse par exemple (2A, 2B)
      return true;
    }
    return false;
  };

  let pinsDepartement = { };
  let pinsDepartementElargi = { };

  // On commence ici
  if (!deps.get(options.departement) && !toms.map(i => i.tom_com).includes(options.departement)) {
    exit(`Le code departement saisi ${options.departement} est inconnu `);
    return;
  }
  if (toms.map(i => i.tom_com).includes(options.departement)) {
    options.departement = '00';
  }
  // Ajouter en amont si aucune SA n'a pas de coordonnée insee et ni de CN
  pinsDepartement[options.departement] = [];
  pinsDepartementElargi[options.departement] = [];

  const regexFormatDate = new RegExp(/^((202)[1-9])(-)(((0)[0-9])|((1)[0-2]))(-)([0-2][0-9]|(3)[0-1])$/);
  if (!regexFormatDate.test(options.date)) {
    exit(`Le date saisi est invalide (${options.date})`);
    return;
  }
  const date = dayjs(options.date, 'YYYY-MM-DD').toDate();
  const structuresIds = await db.collection('structures').find({
    'statut': 'VALIDATION_COSELEC',
    'codeDepartement': options.departement,
    'conventionnement.statut': { '$nin': ['NON_INTERESSÉ'] }
  }).toArray();
  logger.info(`Il y a ${structuresIds.length} structure(s) dans le département ${options.departement}`);

  for (const sa of structuresIds) {
    let structure = await db.collection('structures').findOne({ idPG: sa.idPG });
    const codeDepartementInsee2Ban = structure?.adresseInsee2Ban?.postcode ?? structure?.insee?.adresse?.code_postal;
    const codeCommuneInsee2Ban = structure?.adresseInsee2Ban?.citycode ?? structure?.insee?.adresse?.code_commune;

    // Détection des erreurs
    if (!structure?.adresseInsee2Ban?.name) {
      logger.info('Pas d\'infos BAN pour la SA ' + sa.idPG);
    }
    if (!structure?.coordonneesInsee) {
      logger.info('Pas de coordonneesInsee pour la SA ' + sa.idPG);
    }

    // Si la Structure a des CNFS actifs
    const conseillers = await db.collection('misesEnRelation').aggregate([
      {
        $match: {
          'structure.$id': structure._id,
          'statut': 'finalisee',
          'conseillerObj.nonAffichageCarto': { $ne: true },
          '$or': [
            { typeDeContrat: 'CDI' },
            { reconventionnement: true },
            { typeDeContrat: { $exists: false } },
            {
              $and: [
                { typeDeContrat: { $ne: 'CDI' } },
                { dateFinDeContrat: { $gte: date } }
              ]
            }
          ]
        }
      },
      {
        $project: {
          '_id': '$conseillerObj._id',
          'idPG': '$conseillerObj.idPG',
          'nom': '$conseillerObj.nom',
          'prenom': '$conseillerObj.prenom',
          'telephonePro': '$conseillerObj.telephonePro',
          'structure.coordonneesInsee': '$structureObj.coordonneesInsee',
          'structure.location': '$structureObj.location',
          'structure.codeDepartement': '$structureObj.codeDepartement',
          'structure.codeCommune': '$structureObj.codeCommune',
          'structure.nom': '$structureObj.nom',
          'structure.estLabelliseAidantsConnect': '$structureObj.estLabelliseAidantsConnect',
          'structure.estLabelliseFranceServices': '$structureObj.estLabelliseFranceServices',
          'structure.insee': '$structureObj.insee',
          'structure.adresseInsee2Ban': '$structureObj.adresseInsee2Ban'
        }
      }
    ]).toArray();

    if (conseillers.length > 0) {
      for (const c of conseillers) {
        const permanencePrincipaleConseiller = await getPermanencePrincipaleByConseiller(c._id);
        const permanencesConseiller = await getPermanencesByConseiller(c._id);

        if (permanencesConseiller.length > 0 && !permanencePrincipaleConseiller) {
          logger.info('Pas de principale pour conseiller : ' + c.idPG);
        }

        if (permanencesConseiller.length > 0 && permanencePrincipaleConseiller) {
          try {
            // eslint-disable-next-line max-len
            let depReg = codePostal2departementRegion(String(permanencePrincipaleConseiller.adresse.codePostal), String(permanencePrincipaleConseiller.adresse.codeCommune));
            if (depReg?.num_dep === options.departement) {
              // on prend le lien de la permanence principale
              pinsDepartement[depReg.num_dep].push(toGeoJsonFromPermanence(c, permanencePrincipaleConseiller));
              // et les autres
              for (const p of permanencesConseiller) {
                const depReg = codePostal2departementRegion(String(p.adresse.codePostal), String(p.adresse.codeCommune));
                pinsDepartementElargi[depReg.num_dep].push(toGeoJsonFromPermanence(c, p));
              }
            } else {
              // eslint-disable-next-line max-len
              logger.warn(`Reject de la permanence qui est situé dans le ${depReg?.num_dep} idPerm: ${permanencePrincipaleConseiller._id} (idCN : ${c.idPG}/ idStructure: ${structure.idPG})`);
            }
          } catch (error) {
            logger.error('Stack trace:', error.stack);
          }
          // Pour éviter d'inclure une adresse (adresse du siret) non situé dans le meme département
        } else if (checkDiffDepartement(codeDepartementInsee2Ban, codeCommuneInsee2Ban, structure)) {
          pinsDepartement[structure.codeDepartement].push(toGeoJsonFromStructure(structure));
          pinsDepartementElargi[structure.codeDepartement].push(toGeoJsonFromStructure(structure));
        } else {
          // eslint-disable-next-line max-len
          logger.warn(`Le code departement Insee ${codeDepartementInsee2Ban} !== à celle de la structure ${structure.codeDepartement} (idCN: ${c.idPG}/ idStructure: ${structure.idPG})`);
        }
      }
    } else if (checkDiffDepartement(codeDepartementInsee2Ban, codeCommuneInsee2Ban, structure)) {
      // Si la Structure n'a PAS de CNFS actif
      // On prend l'adresse de la structure
      pinsDepartement[structure.codeDepartement].push(toGeoJsonFromStructure(structure));
      pinsDepartementElargi[structure.codeDepartement].push(toGeoJsonFromStructure(structure));
    } else {

      // eslint-disable-next-line max-len
      logger.warn(`Le code departement Insee ${codeDepartementInsee2Ban} !== à celle de la structure ${structure.codeDepartement} (0 conseiller/ idStructure: ${structure.idPG})`);
    }

  }

  logger.info('Resultats :');

  let csvFileCount = path.join(__dirname, '../../../data/exports', `${options.date}_departement_${options.departement}_carto_count.csv`);
  let fileCount = fs.createWriteStream(csvFileCount, {
    flags: 'w'
  });
  logger.info(`Department ${options.departement} has ${pinsDepartement[options.departement].length} pins.`);
  fileCount.write(`${options.departement},${pinsDepartement[options.departement].length}\n`);
  fileCount.close();

  logger.info('Resultats élargis');
  let csvFileCountElargi = path.join(__dirname, '../../../data/exports', `${options.date}_departement_${options.departement}_carto_elargi_count.csv`);
  let fileCountElargi = fs.createWriteStream(csvFileCountElargi, {
    flags: 'w'
  });
  logger.info(`Department ${options.departement} has ${pinsDepartementElargi[options.departement].length} pins.`);
  fileCountElargi.write(`${options.departement},${pinsDepartementElargi[options.departement].length}\n`);
  fileCountElargi.close();

  let csvFile = path.join(__dirname, '../../../data/exports', `${options.date}_departement_${options.departement}_carto.json`);
  let file = fs.createWriteStream(csvFile, {
    flags: 'w'
  });
  const finalPins = [];
  if (pinsDepartement[options.departement].length > 15) {
    finalPins.push(...pinsDepartement[options.departement]);
  } else {
    finalPins.push(...pinsDepartementElargi[options.departement]);
  }
  const featureCollection = {
    'type': 'FeatureCollection',
    'features': finalPins
  };
  file.write(JSON.stringify(featureCollection, null, 2));
  file.close();

  let csvFileElargi = path.join(__dirname, '../../../data/exports', `${options.date}_departement_${options.departement}_carto_elargi.json`);
  // Toutes les permanences
  let fileElargi = fs.createWriteStream(csvFileElargi, {
    flags: 'w'
  });

  fileElargi.write(JSON.stringify(pinsDepartementElargi[options.departement], null, 2));
  fileElargi.close();

  // Fichiers TXT
  let villePrecedente = '';
  let saPrecedente = '';

  let csvFileTxt = path.join(__dirname, '../../../data/exports', `${options.date}_departement_${options.departement}_carto.txt`);

  let fileTxt = fs.createWriteStream(csvFileTxt, {
    flags: 'w'
  });

  // Si moins de 15 pins dans le département
  // on prend la liste complète des permanences
  let pins = (pinsDepartement[options.departement].length > 15) ? [...pinsDepartement[options.departement]] : [...pinsDepartementElargi[options.departement]];
  pins.sort(sortByNomSA);
  pins.sort(sortByVille);

  pins.forEach(pin => {
    try {
      if (pin?.properties?.address && pin?.properties?.addressParts) {
        fileTxt.write(
          `${pin?.properties?.addressParts?.ville && pin?.properties?.addressParts?.ville.toUpperCase() !== villePrecedente?.toUpperCase() ?
            '.\n\n' + pin?.properties?.addressParts?.ville.toUpperCase() :
            ''
          }${pin?.properties.name !== saPrecedente || pin?.properties?.addressParts?.ville?.toUpperCase() !== villePrecedente?.toUpperCase() ?
            // eslint-disable-next-line max-len
            ' • ' + pin?.properties?.name.fixSpaces().removeSpacesParentheses().toUpperCase() + ', ' + pin?.properties?.address.fixSpaces().removeSpacesParentheses() + (pin?.properties?.telephone && pin?.properties?.telephone !== '' ? ' – ' : '') + pin?.properties?.telephone :
            ''
          }`);
      } else {
        logger.error(`Addresse manquante pour :`);
        logger.error(JSON.stringify(pin, null, 2));
      }
      villePrecedente = pin.properties.addressParts.ville?.toUpperCase();
      saPrecedente = pin.properties.name;
    } catch (e) {
      logger.info(JSON.stringify(pin, null, 2));
      logger.error('Stack trace:', e.stack);
    }
  });
  fileTxt.close();
});

