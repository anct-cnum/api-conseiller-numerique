#!/usr/bin/env node
'use strict';
const { ObjectID } = require('mongodb');
const path = require('path');
const fs = require('fs');
const cli = require('commander');

const { execute } = require('../utils');

cli.description('Export structures')
.option('-a, --activated', 'Only activated structures')
.option('-m, --matchingValidated', 'Only structures with activated matching')
.helpOption('-e', 'HELP command')
.parse(process.argv);

execute(async ({ logger, db, exit }) => {
  let query = {};
  let count = 0;

  if (cli.activated && cli.matchingValidated) {
    exit('Les paramètres activated et matchingValidated sont exclusifs');
  }
  if (cli.activated) {
    query = { userCreated: true };
  }

  const structures = await db.collection('structures').find(query).toArray();
  let promises = [];
  logger.info(`Generating CSV file...`);

  let type = 'toutes';
  if (cli.activated) {
    type = 'activees';
  }

  if (cli.matchingValidated) {
    type = 'recrutees';
  }

  let csvFile = path.join(__dirname, '../../../data/exports', `structures_${type}.csv`);

  let file = fs.createWriteStream(csvFile, {
    flags: 'w'
  });
  // eslint-disable-next-line max-len
  file.write('SIRET structure;ID Structure;Dénomination;Type;Code postal;Code commune;Code département;Code région;Téléphone;Email;Compte créé;Mot de passe choisi;Nombre de mises en relation;Validée en COSELEC;Nombre de conseillers validés par le COSELEC;Numéro COSELEC;ZRR;Labelisée France Services;Raison sociale\n');

  structures.forEach(structure => {
    promises.push(new Promise(async resolve => {
      const matchings = await db.collection('misesEnRelation').countDocuments({ 'structure.$id': new ObjectID(structure._id) });
      let matchingsValidated = 0;
      if (cli.matchingValidated) {
        matchingsValidated = await db.collection('misesEnRelation').countDocuments({ 'structure.$id': new ObjectID(structure._id), 'statut': 'recrutee' });
      }
      if (!cli.matchingValidated || matchingsValidated > 0) {
        const user = await db.collection('users').findOne({ 'entity.$id': new ObjectID(structure._id) });
        try {
          // eslint-disable-next-line max-len
          file.write(`${structure.siret};${structure.idPG};${structure.nom};${structure.type === 'PRIVATE' ? 'privée' : 'publique'};${structure.codePostal};${structure.codeCommune};${structure.codeDepartement};${structure.codeRegion};${structure.contactTelephone};${structure.contactEmail};${structure.userCreated ? 'oui' : 'non'};${user !== null && user.passwordCreated ? 'oui' : 'non'};${matchings};${structure.statut === 'VALIDATION_COSELEC' ? 'oui' : 'non'};${structure.statut === 'VALIDATION_COSELEC' ? [...structure.coselec].pop().nombreConseillersCoselec : 0};${structure.statut === 'VALIDATION_COSELEC' ? [...structure.coselec].pop().numero : ''};${structure.estZRR ? 'oui' : 'non'};${structure.estLabelliseFranceServices ? 'oui' : 'non'};${structure?.insee?.entreprise?.raison_sociale ? structure?.insee?.entreprise?.raison_sociale : ''}\n`);
        } catch (e) {
          console.log(e)
          logger.error(`Une erreur est survenue sur la structure idPG=${structure.idPG}`);
        }
        count++;
      }
      resolve();
    }));
  });

  await Promise.all(promises);
  logger.info(`${count} structures exported`);
  file.close();
});
