#!/usr/bin/env node
'use strict';
const { ObjectID } = require('mongodb');
const path = require('path');
const fs = require('fs');
const moment = require('moment');
const utils = require('../../utils/index.js');
const { program } = require('commander');
const CSVToJSON = require('csvtojson');

const { execute } = require('../utils');

program.description('Export candidats')
.option('-n, --nom <NOM>', 'définir le nom')
.option('-s, --siret <SIRET>', 'définir un SIRET')
.option('-sl, --siretList <Nom de fichier>', 'Le nom du fichier qui contient la liste des SIRET')
.helpOption('-e', 'HELP command')
.parse(process.argv);

execute(__filename, async ({ logger, db, exit }) => {
  let parametre = { };
  const siretList = program.siretList;
  const nom = program.nom;
  const siret = program.siret;
  if ((siretList && nom) || (nom ^ siret)) {
    exit('Les paramètres nom, siret et siretList ne doivent pas être défini en même temps');
    return;
  }

  if (nom) {
    parametre = { '$or': [{ 'statut': { $eq: 'recrutee' } }, { 'statut': { $eq: 'finalisee' } }], 'structureObj.nom': nom };
  } else if (siret) {
    parametre = { '$or': [{ 'statut': { $eq: 'recrutee' } }, { 'statut': { $eq: 'finalisee' } }], 'structureObj.siret': siret };
  } else if (siretList) {
    const siretArray = async () => {
      try {
        const structures = await CSVToJSON().fromFile(`data/imports/${siretList}`);
        return structures;
      } catch (err) {
        throw err;
      }
    };
    const list = await siretArray();
    const listSiret = await list.map(item => item.SIRET);
    parametre = { '$or': [{ 'statut': { $eq: 'recrutee' } }, { 'statut': { $eq: 'finalisee' } }], 'structureObj.siret': { $in: listSiret } };
  }

  const miseEnrelations = await db.collection('misesEnRelation').find(parametre).sort({ 'miseEnrelation.structure.oid': 1 }).toArray();
  let promises = [];

  logger.info(`Generating CSV file...`);
  let csvFile = path.join(__dirname, '../../../data/exports', 'candidats.csv');

  let file = fs.createWriteStream(csvFile, {
    flags: 'w'
  });

  file.write('Date candidature;Date recrutement;prenom;nom;expérience;téléphone;email;Code Postal;Nom commune;Département;diplômé;palier pix;SIRET structure;ID Structure;Dénomination;Type;Code postal;Code commune;Code département;Code région;Prénom contact SA;Nom contact SA;Téléphone contact SA;Email contact SA;ID conseiller;Nom du comité de sélection;Nombre de conseillers attribués en comité de sélection\n');

  miseEnrelations.forEach(miseEnrelation => {
    promises.push(new Promise(async resolve => {
      let conseiller = await db.collection('conseillers').findOne({ _id: new ObjectID(miseEnrelation.conseiller.oid) });
      let structure = await db.collection('structures').findOne({ _id: new ObjectID(miseEnrelation.structure.oid) });
      // Cherche le bon Coselec
      const coselec = utils.getCoselec(structure);
      file.write(`${moment(conseiller.createdAt).format('DD/MM/yyyy')};${miseEnrelation.dateRecrutement === null ? 'non renseignée' : moment(miseEnrelation.dateRecrutement).format('DD/MM/yyyy')};${conseiller.prenom};${conseiller.nom};${conseiller.aUneExperienceMedNum ? 'oui' : 'non'};${conseiller.telephone};${conseiller.email};${conseiller.codePostal};${conseiller.nomCommune};${conseiller.codeDepartement};${conseiller.estDiplomeMedNum ? 'oui' : 'non'};${conseiller.pix ? conseiller.pix.palier : ''};${structure.siret};${structure.idPG};${structure.nom};${structure.type};${structure.codePostal};${structure.codeCommune};${structure.codeDepartement};${structure.codeRegion};${structure?.contact?.prenom};${structure?.contact?.nom};${structure?.contact?.telephone};${structure?.contact?.email};${conseiller.idPG};${coselec.numero};${coselec.nombreConseillersCoselec};\n`);
      resolve();
    }));
  });
  await Promise.all(promises);
  file.close();
});
