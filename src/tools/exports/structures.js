#!/usr/bin/env node
'use strict';
const { ObjectID } = require('mongodb');
const path = require('path');
const fs = require('fs');
const cli = require('commander');
const utils = require('../../utils/index.js');

const { execute } = require('../utils');

cli.description('Export structures')
.option('-a, --activated', 'Only activated structures')
.option('-m, --matchingValidated', 'Only structures with activated matching')
.helpOption('-e', 'HELP command')
.parse(process.argv);

execute(__filename, async ({ logger, db, exit }) => {
  let query = { };
  let count = 0;

  if (cli.activated && cli.matchingValidated) {
    exit('Les paramètres activated et matchingValidated sont exclusifs');
  }
  if (cli.activated) {
    query = { statut: 'VALIDATION_COSELEC', userCreated: true };
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
  file.write('SIRET structure;ID Structure;Dénomination;Type;Statut;Code postal;Code commune;Code département;Code région;Téléphone;Email;Compte créé;Mot de passe choisi;Nombre de mises en relation;Nombre de conseillers souhaités;Validée en COSELEC;Nombre de conseillers validés par le COSELEC;Numéro COSELEC;ZRR;QPV;Nombre de quartiers QPV;Labelisée France Services;Raison sociale;Nom commune INSEE;Code commune INSEE;Adresse postale;Libellé catégorie juridique niv III;Grand Réseau;Nom Grand Réseau\n');

  structures.forEach(structure => {
    promises.push(new Promise(async resolve => {
      const matchings = await db.collection('misesEnRelation').countDocuments({ 'structure.$id': new ObjectID(structure._id) });
      let matchingsValidated = 0;
      if (cli.matchingValidated) {
        matchingsValidated = await db.collection('misesEnRelation').findOne({ 'structure.$id': new ObjectID(structure._id), 'statut': 'recrutee' });
      }
      if (!cli.matchingValidated || matchingsValidated !== null) {
        const user = await db.collection('users').findOne({ 'entity.$id': new ObjectID(structure._id) });

        try {
          // Cherche le bon Coselec
          const coselec = utils.getCoselec(structure);

          // France Services
          let label = 'non renseigné';
          if (structure?.estLabelliseFranceServices && structure.estLabelliseFranceServices === 'OUI') {
            label = 'oui';
          } else if (structure?.estLabelliseFranceServices && structure.estLabelliseFranceServices === 'NON') {
            label = 'non';
          }

          // Adresse
          let adresse = (structure?.insee?.adresse?.numero_voie ?? '') + ' ' +
            (structure?.insee?.adresse?.type_voie ?? '') + ' ' +
            (structure?.insee?.adresse?.libelle_voie ?? '') + '\n' +
            (structure?.insee?.adresse?.complement_adresse ? structure.insee.adresse.complement_adresse + '\n' : '') +
            (structure?.insee?.adresse?.code_postal ?? '') + ' ' +
            (structure?.insee?.adresse?.libelle_commune ?? '');

          adresse = adresse.replace(/["']/g, '');

          // eslint-disable-next-line max-len
          file.write(`${structure.siret};${structure.idPG};${structure.nom};${structure.type === 'PRIVATE' ? 'privée' : 'publique'};${structure.statut};${structure.codePostal};${structure.codeCommune};${structure.codeDepartement};${structure.codeRegion};${structure?.contact?.telephone};${structure?.contact?.email};${structure.userCreated ? 'oui' : 'non'};${user !== null && user.passwordCreated ? 'oui' : 'non'};${matchings};${structure.nombreConseillersSouhaites ?? 0};${structure.statut === 'VALIDATION_COSELEC' ? 'oui' : 'non'};${structure.statut === 'VALIDATION_COSELEC' ? coselec?.nombreConseillersCoselec : 0};${structure.statut === 'VALIDATION_COSELEC' ? coselec?.numero : ''};${structure.estZRR ? 'oui' : 'non'};${structure.qpvStatut ?? 'Non défini'};${structure?.qpvListe ? structure.qpvListe.length : 0};${label};${structure?.insee?.unite_legale?.personne_morale_attributs?.raison_sociale ? structure?.insee?.unite_legale?.personne_morale_attributs?.raison_sociale : ''};${structure?.insee?.adresse?.libelle_commune ? structure?.insee?.adresse?.libelle_commune : ''};${structure?.insee?.adresse?.code_commune ? structure?.insee?.adresse?.code_commune : ''};"${adresse}";${structure?.insee?.unite_legale?.forme_juridique?.libelle ?? ''};${structure?.reseau ? 'oui' : 'non'};${structure?.reseau ?? ''}\n`);
        } catch (e) {
          logger.error(`Une erreur est survenue sur la structure idPG=${structure.idPG} : ${e}`);
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
