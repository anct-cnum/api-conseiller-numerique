#!/usr/bin/env node
'use strict';
const path = require('path');
const fs = require('fs');
const cli = require('commander');
const utils = require('../../utils/index.js');

const { execute } = require('../utils');

cli.description('Export structures validées en Coselec')
.helpOption('-e', 'HELP command')
.parse(process.argv);

const coselecs = {
  'COSELEC 1': '24/03/2021',
  'COSELEC 2': '24/03/2021',
  'COSELEC 3': '24/03/2021',
  'COSELEC 4': '31/03/2021',
  'COSELEC 5': '07/04/2021',
  'COSELEC 6': '14/04/2021',
  'COSELEC 7': '21/04/2021',
  'COSELEC 8': '28/04/2021',
  'COSELEC 9': '05/05/2021',
  'COSELEC 10': '19/05/2021',
  'COSELEC 11': '09/06/2021',
  'COSELEC 12': '16/06/2021',
  'COSELEC 13': '23/06/2021',
  'COSELEC 14': '30/06/2021',
  'COSELEC 15': '07/07/2021',
  'COSELEC 16': '15/07/2021',
  'COSELEC 17': '28/07/2021',
};

execute(__filename, async ({ logger, db, Sentry }) => {
  // Liste des départements et régions
  const departements = require('../coselec/departements-region.json');
  const deps = new Map();
  for (const value of departements) {
    deps.set(String(value.num_dep), value);
  }

  const tomsJSON = require('../coselec/tom.json');
  const toms = new Map();
  for (const value of tomsJSON) {
    toms.set(String(value.num_tom), value);
  }

  let query = { statut: 'VALIDATION_COSELEC', userCreated: true };
  let count = 0;

  const structures = await db.collection('structures').find(query).toArray();
  let promises = [];
  logger.info(`Generating CSV file...`);

  let csvFile = path.join(__dirname, '../../../data/exports', `structures_open_data.csv`);

  let file = fs.createWriteStream(csvFile, {
    flags: 'w'
  });
  // eslint-disable-next-line max-len
  file.write('Raison sociale;Commune INSEE;Département;Région;Nombre de conseillers validés par le COSELEC;Date de validation en comité de sélection;Type;SIRET;Code département;Adresse;Code commune INSEE;Code postal;Investissement financier estimatif total de l’Etat;ZRR;QPV;France services\n');

  structures.forEach(structure => {
    promises.push(new Promise(async resolve => {
      try {
        // Cherche le bon Coselec
        const coselec = utils.getCoselec(structure);

        // France Services
        let label = 'non renseigné';
        if (structure?.estLabelliseFranceServices === 'OUI') {
          label = 'oui';
        } else if (structure?.estLabelliseFranceServices === 'NON') {
          label = 'non';
        }

        // Adresse
        let adresse = (structure?.insee?.etablissement?.adresse?.numero_voie ?? '') + ' ' +
          (structure?.insee?.etablissement?.adresse?.type_voie ?? '') + ' ' +
          (structure?.insee?.etablissement?.adresse?.nom_voie ?? '') + '\n' +
          (structure?.insee?.etablissement?.adresse?.complement_adresse ? structure.insee.etablissement.adresse.complement_adresse + '\n' : '') +
          (structure?.insee?.etablissement?.adresse?.code_postal ?? '') + ' ' +
          (structure?.insee?.etablissement?.adresse?.localite ?? '');

        adresse = adresse.replace(/["']/g, '');

        /*
           * L'engagement de l'Etat est égal à =
           *
           * Une subvention:
           *  Si privé : 32k
           *  Si public
           *        Si Métropole (département à 2 chiffres) : 50k
           *            Si 971/972/973 (ET public) : 70k
           *                Si 974/976 (ET public) : 67,5k
           *
           * + Une formation :
           *   4805€ en moyenne
           */

        let investissement = 0;

        if (structure.type === 'PRIVATE') {
          investissement = (32000 + 4805) * coselec.nombreConseillersCoselec;
        } else if (structure.codeDepartement === '971' || structure.codeDepartement === '972' || structure.codeDepartement === '973') {
          investissement = (70000 + 4805) * coselec.nombreConseillersCoselec;
        } else if (structure.codeDepartement === '974' || structure.codeDepartement === '976') {
          investissement = (67500 + 4805) * coselec.nombreConseillersCoselec;
        } else {
          investissement = (50000 + 4805) * coselec.nombreConseillersCoselec;
        }

        // Nom département, région ou TOM
        let structureDepartement = '';
        let structureRegion = '';

        if (deps.has(structure.codeDepartement)) {
          structureDepartement = deps.get(structure.codeDepartement).dep_name;
          structureRegion = deps.get(structure.codeDepartement).region_name;
        } else if (toms.has(structure.codeDepartement)) {
          structureDepartement = toms.get(structure.codeDepartement).tom_name;
          structureRegion = toms.get(structure.codeDepartement).tom_name;
        }

        // eslint-disable-next-line max-len
        file.write(`${structure?.insee?.entreprise?.raison_sociale ?? ''};${structure?.insee?.etablissement?.commune_implantation?.value ?? ''};${structureDepartement};${structureRegion};${coselec?.nombreConseillersCoselec};${coselecs[coselec?.numero]};${structure.type === 'PRIVATE' ? 'privée' : 'publique'};${structure.siret};${structure.codeDepartement};"${adresse}";${structure?.insee?.etablissement?.adresse?.code_insee_localite};${structure.codePostal};${investissement.toString()};${structure.estZRR ? 'oui' : 'non'};${structure.qpvStatut ? structure.qpvStatut.toLowerCase() : 'Non défini'};${label};\n`);
      } catch (e) {
        Sentry.captureException(`Une erreur est survenue sur la structure idPG=${structure.idPG} : ${e}`);
        logger.error(`Une erreur est survenue sur la structure idPG=${structure.idPG} : ${e}`);
      }
      count++;
      resolve();
    }));
  });

  await Promise.all(promises);
  logger.info(`${count} structures exported`);
  file.close();
});
