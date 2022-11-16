#!/usr/bin/env node
'use strict';
const path = require('path');
const fs = require('fs');
const { ObjectId } = require('mongodb');

const { execute } = require('../utils');

const { formatAddressFromInsee, formatAddressFromPermanence, formatOpeningHours } = require('../../services/conseillers/common');

const ConseillerStatut = {
  Recrute: 'RECRUTE'
};

execute(__filename, async ({ logger, db }) => {
  const getConseillersWithGeolocation = db => async () =>
    db.collection('conseillers').aggregate([
      {
        $match: {
          statut: ConseillerStatut.Recrute,
          nonAffichageCarto: { $ne: true },
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
          'structure.nom': 1,
          'structure.contact.telephone': 1,
          'structure.estLabelliseAidantsConnect': 1,
          'structure.estLabelliseFranceServices': 1,
          'structure.insee.etablissement.adresse': 1
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
    ...structure.insee ? { address: formatAddressFromInsee(structure.insee.etablissement.adresse) } : {}
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
      telephone: conseiller.telephonePro ?? conseiller.structure.contact.telephone,
      address: formatAddressFromPermanence(permanence.adresse),
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

  let promises = [];
  let listeConseillers = [];

  let csvFile = path.join(__dirname, '../../../data/exports', 'liste_cnfs_pour_carto.json');

  let file = fs.createWriteStream(csvFile, {
    flags: 'w'
  });

  const conseillers = await getConseillersWithGeolocation(db)();
  logger.info(`${conseillers.length} conseillers`);
  logger.info(`Generating JSON file...`);

  // Pour chaque conseiller :
  // - S'il a au moins une permanence, afficher la principale, ou l'unique
  // - Sinon l'adresse de sa Structure
  conseillers.forEach(conseiller => {
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
  });
  await Promise.all(promises);
  file.write(JSON.stringify(listeConseillers, null, 4));
  file.close();
});
