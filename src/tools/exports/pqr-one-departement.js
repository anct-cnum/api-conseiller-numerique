#!/usr/bin/env node
'use strict';

// node src\tools\exports\pqr-one-departement.js --departement XX

const path = require('path');
const cli = require('commander');
const fs = require('fs');
const { ObjectId } = require('mongodb');
const { formatOpeningHours } = require('../../services/conseillers/common');
const { execute } = require('../utils');
const departements = require('../../../data/imports/departements-region.json');
const deps = new Map();

for (const value of departements) {
  deps.set(String(value.num_dep), value);
}

const codePostal2departementRegion = cp => {
  if (!/^.{5}$/.test(cp)) {
    return null;
  }
  let dep;
  if ((dep = cp.match(/^9[78]\d/))) {
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

function cleanPhoneNumber(number) {
  let cleaned = number.replace(/\D/g, '');

  if (cleaned.startsWith('33') && cleaned.length === 11) {
    cleaned = '0' + cleaned.substring(2);
  } else if (cleaned.length === 12) { // Pour les DOM comme +590590478535
    cleaned = '0' + cleaned.substring(3);
  }

  return `${cleaned.substring(0, 2)}${cleaned.substring(2, 4)}${cleaned.substring(4, 6)}${cleaned.substring(6, 8)}${cleaned.substring(8, 10)}`;
}

cli.description('Export liste CNFS pour carto txt')
.option('-d, --departement <departement>', 'departement: code departement')
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
      //telephone: s?.contact?.telephone ? cleanPhoneNumber(s?.contact?.telephone) : '',
      telephone: '',
      address: uniformiseAdresse(s?.adresseInsee2Ban?.name),
      addressParts: {
        numeroRue: s?.adresseInsee2Ban?.housenumber,
        rue: s?.adresseInsee2Ban?.street,
        codePostal: s?.adresseInsee2Ban?.postcode,
        ville: s?.adresseInsee2Ban?.city,
      },
      name: s.nom,
    }
  });

  let pinsDepartement = {};
  let pinsDepartementElargi = {};

  function addPinToDepartment(departmentId, pin) {
    if (!pinsDepartement[departmentId]) {
      pinsDepartement[departmentId] = [];
    }
    pinsDepartement[departmentId].push(pin);
  }

  function addPinToDepartmentElargi(departmentId, pin) {
    if (!pinsDepartementElargi[departmentId]) {
      pinsDepartementElargi[departmentId] = [];
    }
    pinsDepartementElargi[departmentId].push(pin);
  }

  // On commence ici
  if (!deps.get(cli.departement)) {
    exit(`Le code departement saisi ${cli.departement} est inconnu `);
    return;
  }
  const structuresIds = await db.collection('structures').find({
    statut: 'VALIDATION_COSELEC', codeDepartement: cli.departement }).toArray(); // a voir si avec RECONVENTIONNEMENT_VALIDE

  for (const sa of structuresIds) {
    let structure = await db.collection('structures').findOne({ idPG: sa.idPG });
    const codeDepartementInsee2Ban = structure?.adresseInsee2Ban?.postcode?.substr(0, 2);

    // Détection des erreurs
    if (!structure?.adresseInsee2Ban?.name) {
      logger.info('Pas d\'infos BAN pour la SA ' + sa.idPG);
    }
    if (!structure?.location) {
      logger.info('Pas de location pour la SA ' + sa.idPG);
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
                { dateFinDeContrat: { $gte: new Date('2024-02-01') } } // Date à Re définir
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
          'structure.contact.telephone': '$structureObj.contact.telephone',
          'structure.estLabelliseAidantsConnect': '$structureObj.estLabelliseAidantsConnect',
          'structure.estLabelliseFranceServices': '$structureObj.estLabelliseFranceServices',
          'structure.insee.adresse': '$structureObj.insee.adresse',
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
            const depReg = codePostal2departementRegion(String(permanencePrincipaleConseiller.adresse.codePostal));
            if (depReg?.num_dep === cli.departement) {
              // on prend le lien de la permanence principale
              addPinToDepartment(depReg.num_dep, toGeoJsonFromPermanence(c, permanencePrincipaleConseiller));
              // et les autres
              for (const p of permanencesConseiller) {
                const depReg = codePostal2departementRegion(String(p.adresse.codePostal));
                addPinToDepartmentElargi(depReg.num_dep, toGeoJsonFromPermanence(c, p));
              }
            } else {
              // eslint-disable-next-line max-len
              logger.warn(`Reject de la permanence qui est situé dans le ${depReg?.num_dep} idPerm: ${permanencePrincipaleConseiller._id} (idCN : ${c.idPG}/ idStructure: ${structure.idPG})`);
            }
          } catch (error) {
            logger.error('Stack trace:', error.stack);
          }
          // Pour éviter d'inclure une adresse (adresse du siret) non situé dans le meme département
        } else if (codeDepartementInsee2Ban === structure.codeDepartement) {
          addPinToDepartment(structure.codeDepartement, toGeoJsonFromStructure(structure));
          addPinToDepartmentElargi(structure.codeDepartement, toGeoJsonFromStructure(structure));
        } else {
          // eslint-disable-next-line max-len
          logger.warn(`Le code departement Insee ${codeDepartementInsee2Ban} !== à celle de la structure ${structure.codeDepartement} (idCN: ${c.idPG}/ idStructure: ${structure.idPG})`);
        }
      }
    } else if (codeDepartementInsee2Ban === structure.codeDepartement) {
      // Si la Structure n'a PAS de CNFS actif
      // On prend l'adresse de la structure
      addPinToDepartment(structure.codeDepartement, toGeoJsonFromStructure(structure));
      addPinToDepartmentElargi(structure.codeDepartement, toGeoJsonFromStructure(structure));
    } else {

      // eslint-disable-next-line max-len
      logger.warn(`Le code departement Insee ${codeDepartementInsee2Ban} !== à celle de la structure ${structure.codeDepartement} (0 conseiller/ idStructure: ${structure.idPG})`);
    }

  }

  logger.info('Resultats :');

  let csvFileCount = path.join(__dirname, '../../../data/exports', `carto_count_departement_${cli.departement}.csv`);
  let fileCount = fs.createWriteStream(csvFileCount, {
    flags: 'w'
  });
  logger.info(`Department ${cli.departement} has ${pinsDepartement[cli.departement].length} pins.`);
  fileCount.write(`${cli.departement},${pinsDepartement[cli.departement].length}\n`);
  fileCount.close();

  logger.info('Resultats élargis');
  let csvFileCountElargi = path.join(__dirname, '../../../data/exports', `carto_elargi_count_departement_${cli.departement}.csv`);
  let fileCountElargi = fs.createWriteStream(csvFileCountElargi, {
    flags: 'w'
  });
  logger.info(`Department ${cli.departement} has ${pinsDepartementElargi[cli.departement].length} pins.`);
  fileCountElargi.write(`${cli.departement},${pinsDepartementElargi[cli.departement].length}\n`);
  fileCountElargi.close();

  let csvFile = path.join(__dirname, '../../../data/exports', `carto_departement_${cli.departement}.json`);
  let file = fs.createWriteStream(csvFile, {
    flags: 'w'
  });
  const finalPins = [];
  if (pinsDepartement[cli.departement].length > 15) {
    finalPins.push(...pinsDepartement[cli.departement]);
  } else {
    finalPins.push(...pinsDepartementElargi[cli.departement]);
  }
  const featureCollection = {
    'type': 'FeatureCollection',
    'features': finalPins
  };
  file.write(JSON.stringify(featureCollection, null, 2));
  file.close();

  let csvFileElargi = path.join(__dirname, '../../../data/exports', `carto_elargi_departement_${cli.departement}.json`);
  // Toutes les permanences
  let fileElargi = fs.createWriteStream(csvFileElargi, {
    flags: 'w'
  });

  fileElargi.write(JSON.stringify(pinsDepartementElargi[cli.departement], null, 2));
  fileElargi.close();

  // Fichiers TXT
  let villePrecedente = '';
  let saPrecedente = '';

  let csvFileTxt = path.join(__dirname, '../../../data/exports', `carto_departement_${cli.departement}.txt`);

  let fileTxt = fs.createWriteStream(csvFileTxt, {
    flags: 'w'
  });

  // Si moins de 15 pins dans le département
  // on prend la liste complète des permanences
  let pins = (pinsDepartement[cli.departement].length > 15) ? [...pinsDepartement[cli.departement]] : [...pinsDepartementElargi[cli.departement]];
  pins.sort(sortByNomSA);
  pins.sort(sortByVille);

  pins.forEach(pin => {
    try {
      if (pin?.properties?.address && pin?.properties?.addressParts) {
        fileTxt.write(
          `${pin?.properties?.addressParts?.ville && pin?.properties?.addressParts?.ville.toUpperCase() !== villePrecedente ?
            '.\n\n' + pin?.properties?.addressParts?.ville.toUpperCase() :
            ''
          }${pin?.properties.name !== saPrecedente ?
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

