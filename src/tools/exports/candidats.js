#!/usr/bin/env node
'use strict';
const { ObjectID } = require('mongodb');
const _ = require('lodash');
const path = require('path');
const fs = require('fs');
const moment = require('moment');

const { execute } = require('../utils');

execute(async ({ logger, db }) => {
  const miseEnrelations = await db.collection('misesEnRelation').find({ statut: 'recrutee' }).sort({ 'miseEnrelation.structure.oid': 1 }).toArray();
  let promises = [];

  logger.info(`Generating CSV file...`);
  let csvFile = path.join(__dirname, '../../../data', 'candidats.csv');

  let file = fs.createWriteStream(csvFile, {
    flags: 'w'
  });

  file.write('Date candidature;Date recrutement;prenom;nom;Département;diplômé;SIRET structure;ID Structure;Dénomination;Type;Code postal;Code commune;Code département;Code région\n');

  miseEnrelations.forEach(miseEnrelation => {
    promises.push(new Promise(async resolve => {
      let conseiller = await db.collection('conseillers').findOne({ _id: new ObjectID(miseEnrelation.conseiller.oid) });
      let structure = await db.collection('structures').findOne({ _id: new ObjectID(miseEnrelation.structure.oid) });
      file.write(`${moment(conseiller.createdAt).format('DD/MM/yyyy')};${miseEnrelation.dateRecrutement === null ? 'non renseignée' : moment(miseEnrelation.dateRecrutement).format('DD/MM/yyyy')};${conseiller.prenom};${conseiller.nom};${conseiller.codeDepartement};${conseiller.estDiplomeMedNum ? 'oui' : 'non'};${structure.siret};${structure.idPG};${structure.nom};${structure.type};${structure.codePostal};${structure.codeCommune};${structure.codeDepartement};${structure.codeRegion}\n`);
      resolve();
    }));
  });

  await Promise.all(promises);
  file.close();
});
