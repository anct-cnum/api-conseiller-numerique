#!/usr/bin/env node
'use strict';
const path = require('path');
const fs = require('fs');
const { ObjectId } = require('mongodb');
const cli = require('commander');

const { execute } = require('../utils');

const { formatOpeningHours } = require('../../services/conseillers/common');

const ConseillerStatut = {
  Recrute: 'RECRUTE'
};

const addressGroupSeparator = ' ';
const addressPartSeparator = ', ';

const isValidAddressPart = addressPart => addressPart !== undefined && addressPart !== null && addressPart.trim() !== '';

const removeNull = addressPart => addressPart.replace(/null/g, '');

const addressGroup = addressParts => addressParts.filter(isValidAddressPart).map(removeNull).join(addressGroupSeparator);

const uniformiseAdresse = a =>
  a?.replace(/avenue/gi, 'av.')
  .replace(/av /gi, 'av. ')
  //    .replace(/place/gi,'pl.')
  .replace(/pl /gi, 'pl. ')
  .replace(/allée/gi, 'all.')
  .replace(/all /gi, 'all. ')
  .replace(/boulevard/gi, 'blvd')
  .replace(/bd /gi, 'blvd. ')
  .replace(/grd/gi, 'grand')
;

cli.description('Export liste CNFS pour carto txt')
.option('--departement [departement]', 'Département')
.helpOption('-e', 'HELP command')
.parse(process.argv);

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

const formatAddressFromInsee = adresse => [
  addressGroup([
    adresse.numero_voie,
    uniformiseAdresse(adresse.type_voie),
    adresse.libelle_voie
  ]),
  adresse.complement_adresse,
].filter(isValidAddressPart).join(addressPartSeparator);

const formatAddressFromPermanence = adresse => [
  addressGroup([
    adresse.numeroRue,
    uniformiseAdresse(adresse.rue)
  ])
].filter(isValidAddressPart).join(addressPartSeparator);

execute(__filename, async ({ logger, db }) => {
  const getConseillersWithGeolocation = db => async () =>
    db.collection('conseillers').aggregate([
      {
        $match: {
          statut: ConseillerStatut.Recrute,
          nonAffichageCarto: { $ne: true },
          //          codeDepartement: '59',
        }
      },
      {
        $lookup: {
          localField: 'structureId',
          from: 'structures',
          foreignField: '_id',
          as: 'structure'
        }
      },
      { $unwind: '$structure' },
      {
        $project: {
          '_id': 1,
          'nom': 1,
          'prenom': 1,
          'telephonePro': 1,
          'structure.coordonneesInsee': 1,
          'structure.location': 1,
          'structure.codeDepartement': 1,
          'structure.codeCommune': 1,
          'structure.nomCommune': 1,
          'structure.nom': 1,
          'structure.contact.telephone': 1,
          'structure.estLabelliseAidantsConnect': 1,
          'structure.estLabelliseFranceServices': 1,
          'structure.insee.adresse': 1,
        }
      }
    ]).toArray();

  const getGeometry = structure =>
    structure.coordonneesInsee ?
      { ...structure.coordonneesInsee } :
      { ...structure.location };

  const formatStructure = structure => ({
    name: structure.nom,
    isLabeledAidantsConnect: structure.estLabelliseAidantsConnect === 'OUI',
    isLabeledFranceServices: structure.estLabelliseFranceServices === 'OUI',
    ...structure.insee ? { address: formatAddressFromInsee(structure.insee.adresse) } : {},
  });

  const toGeoJsonFromConseillersWithGeolocation = geolocatedConseiller => ({
    type: 'Feature',
    geometry: getGeometry(geolocatedConseiller.structure),
    properties: {
      id: geolocatedConseiller._id,
      nom: geolocatedConseiller.nom,
      prenom: geolocatedConseiller.prenom,
      telephone: geolocatedConseiller.telephonePro ?? geolocatedConseiller.structure.contact.telephone,
      structureId: geolocatedConseiller.structure._id,
      addressParts: {
        numeroRue: geolocatedConseiller.structure.insee.adresse.numero_voie ?? '',
        rue: `${geolocatedConseiller.structure.insee.adresse.type_voie} ${geolocatedConseiller.structure.insee.adresse.libelle_voie}` +
        ` ${geolocatedConseiller.structure.insee.adresse.complement_adresse ?? ''}`,
        codePostal: geolocatedConseiller.structure.insee.adresse.code_postal,
        ville: geolocatedConseiller.structure.insee.adresse.libelle_commune,
      },
      ...formatStructure(geolocatedConseiller.structure)
    }
  });

  const toGeoJsonFromPermanence = (conseiller, permanence) => ({
    type: 'Feature',
    geometry: permanence.location,
    properties: {
      id: permanence._id.toString(),
      nom: conseiller.nom,
      prenom: conseiller.prenom,
      telephone: permanence.telephone ?? conseiller.telephonePro ?? conseiller.structure.contact.telephone,
      address: formatAddressFromPermanence(permanence.adresse),
      addressParts: {
        numeroRue: permanence.adresse.numeroRue,
        rue: permanence.adresse.rue,
        codePostal: permanence.adresse.codePostal,
        ville: permanence.adresse.ville,
      },
      name: permanence.nomEnseigne,
      openingHours: formatOpeningHours(permanence.horaires)
    }
  });

  const getPermanencesByConseiller = db => async conseillerId => {
    return await db.collection('permanences').find({ 'conseillers': { '$in': [new ObjectId(conseillerId)] } }).toArray();
  };

  const getPermanencePrincipaleByConseiller = db => async conseillerId => {
    return await db.collection('permanences').find({ 'lieuPrincipalPour': { '$in': [new ObjectId(conseillerId)] } }).toArray();
  };

  // eslint-disable-next-line no-unused-vars
  const uniformiseCasse = str => `${str[0].toUpperCase()}${str.slice(1).toLowerCase()}`;

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

  let promises = [];
  let listeConseillers = [];

  let csvFile = path.join(__dirname, '../../../data/exports', `liste_cnfs_pour_carto-${cli.departement}.txt`);

  let file = fs.createWriteStream(csvFile, {
    flags: 'w'
  });

  const conseillers = await getConseillersWithGeolocation(db)();
  logger.info(`${conseillers.length} conseillers`);
  logger.info(`Generating TXT file...`);

  // Pour chaque conseiller :
  // - S'il a au moins une permanence, afficher la principale, ou l'unique
  // - Sinon l'adresse de sa Structure
  for (const conseiller of conseillers) {
    if (conseiller.structure.codeDepartement !== cli.departement) {
      continue;
    }
    promises.push(new Promise(async resolve => {
      const permanencesConseiller = await getPermanencesByConseiller(db)(conseiller._id);
      const permanencePrincipaleConseiller = await getPermanencePrincipaleByConseiller(db)(conseiller._id);
      if (permanencesConseiller.length > 0) {
        // retourner le lieu de la permanence
        if (permanencePrincipaleConseiller.length > 0) {
          listeConseillers.push(toGeoJsonFromPermanence(conseiller, permanencePrincipaleConseiller[0]));
        } else {
          listeConseillers.push(toGeoJsonFromPermanence(conseiller, permanencesConseiller[0]));
        }
      } else {
        listeConseillers.push(toGeoJsonFromConseillersWithGeolocation(conseiller));
      }
      resolve();
    }));
  }
  await Promise.all(promises);

  listeConseillers.sort(sortByNomSA);
  listeConseillers.sort(sortByVille);

  logger.info(`${listeConseillers.length} conseillers`);

  let villePrecedente = '';
  let saPrecedente = '';

  listeConseillers.forEach(c => {
    file.write(
      // eslint-disable-next-line max-len
      `${c?.properties?.addressParts?.ville && c?.properties?.addressParts?.ville !== villePrecedente ? '.\n\n' + c?.properties?.addressParts?.ville.toUpperCase() : ''}${c?.properties.name !== saPrecedente ? ' • ' + c?.properties?.name.fixSpaces().removeSpacesParentheses().toUpperCase() + ', ' + c?.properties?.address.fixSpaces().removeSpacesParentheses().toLowerCase() + ' - ' : ' – '}${c?.properties?.prenom.toLowerCase().replace(/(^\w|\s\w|-\w)/g, m => m.toUpperCase())}${c?.properties?.telephone ? ', ' : ''}${c?.properties?.telephone.replace(/\+33/, '0')}`);
    villePrecedente = c.properties.addressParts.ville.toUpperCase();
    saPrecedente = c.properties.name;
  });

  file.close();
});
