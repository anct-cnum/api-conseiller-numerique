#!/usr/bin/env node
'use strict';
const path = require('path');
const fs = require('fs');
const utils = require('../../utils/index.js');
const { program } = require('commander');

const { execute } = require('../utils');

program.description('Export structures validées en Coselec')
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
  'COSELEC 18': '25/08/2021',
  'COSELEC 19': '15/09/2021',
  'COSELEC 20': '06/10/2021',
  'COSELEC 21': '13/10/2021',
  'COSELEC 22': '29/10/2021',
  'COSELEC 23': '10/11/2021',
  'COSELEC 24': '08/12/2021',
  'COSELEC 25': '05/01/2022',
  'COSELEC 26': '12/01/2022',
  'COSELEC 27': '19/01/2022',
  'COSELEC 28': '26/01/2022',
  'COSELEC 29': '04/02/2022',
  'COSELEC 30': '09/02/2022',
  'COSELEC 31': '17/02/2022',
  'COSELEC 32': '22/02/2022',
  'COSELEC 33': '02/03/2022',
  'COSELEC 34': '09/03/2022',
  'COSELEC 35': '17/03/2022',
  'COSELEC 36': '23/03/2022',
  'COSELEC 37': '30/03/2022',
  'COSELEC 38': '06/04/2022',
  'COSELEC 39': '13/04/2022',
  'COSELEC 40': '20/04/2022',
  'COSELEC 41': '27/04/2022',
  'COSELEC 42': '04/05/2022',
  'COSELEC 43': '11/05/2022',
  'COSELEC 44': '18/05/2022',
  'COSELEC 45': '25/05/2022',
  'COSELEC 46': '01/06/2022',
  'COSELEC 47': '08/06/2022',
  'COSELEC 48': '29/06/2022',
  'COSELEC 49': '28/07/2022',
  'COSELEC 50': '09/08/2022',
  'COSELEC 51': '08/09/2022',
  'COSELEC 52': '04/10/2022',
  'COSELEC 53': '02/11/2022',
  'COSELEC 54': '06/12/2022',
  'COSELEC 55': '22/12/2022',
  'COSELEC 56': '30/01/2023',
  'COSELEC 57': '23/02/2023',
  'COSELEC 58': '05/04/2023',
  'COSELEC 59': '30/05/2023',
  'COSELEC 60': '29/06/2023',
  'COSELEC 61': '26/07/2023',
  'COSELEC 62': '16/11/2023',
  'COSELEC 62BIS': '22/12/2023',
};

function formatDate(coselec) {
  if ('numero' in coselec) {
    return coselecs[coselec?.numero];
  }
  const date = new Date(coselec.insertedAt);
  const jour = String(date.getDate()).padStart(2, '0');
  const mois = String(date.getMonth() + 1).padStart(2, '0');
  const annee = date.getFullYear();

  return `${jour}/${mois}/${annee}`;
}

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

  let query = { statut: 'VALIDATION_COSELEC', idPG: { $ne: 5017 } }; // BDT
  let count = 0;

  const structures = await db.collection('structures').find(query).toArray();
  let promises = [];

  logger.info(`Generating CSV file...`);

  let csvFile = path.join(__dirname, '../../../data', `structures_open_data.csv`);

  let file = fs.createWriteStream(csvFile, {
    flags: 'w'
  });
  file.write('id;Raison sociale;Commune INSEE;Département;Région;Nombre de conseillers validés par le COSELEC;Date de validation en comité de sélection;Type;SIRET;Code département;Adresse;Code commune INSEE;Code postal;Investissement financier estimatif total de l’Etat;ZRR;QPV;France services\n');

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
        let adresse = (structure?.insee?.adresse?.numero_voie ?? '') + ' ' +
          (structure?.insee?.adresse?.type_voie ?? '') + ' ' +
          (structure?.insee?.adresse?.libelle_voie ?? '') + ' ' +
          (structure?.insee?.adresse?.complement_adresse ? structure.insee.adresse.complement_adresse + ' ' : '') +
          (structure?.insee?.adresse?.code_postal ?? '') + ' ' +
          (structure?.insee?.adresse?.libelle_commune ?? '');

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
           *
           * + Tenue/equipement
           *    297.228€
           *
           * + Certification
           *    326,60€
           *
           */

        let investissement = 0;
        const coutCnfs = 4805 + 297.228 + 326.6;
        if (structure.type === 'PRIVATE') {
          investissement = Math.round((32000 + coutCnfs) * coselec.nombreConseillersCoselec);
        } else if (structure.codeDepartement === '971' || structure.codeDepartement === '972' || structure.codeDepartement === '973') {
          investissement = Math.round((70000 + coutCnfs) * coselec.nombreConseillersCoselec);
        } else if (structure.codeDepartement === '974' || structure.codeDepartement === '976') {
          investissement = Math.round((67500 + coutCnfs) * coselec.nombreConseillersCoselec);
        } else {
          investissement = Math.round((50000 + coutCnfs) * coselec.nombreConseillersCoselec);
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

        file.write(`${structure?.idPG};${structure?.insee?.unite_legale?.personne_morale_attributs?.raison_sociale?.replace(/[,]/g, '') ?? structure.nom};${structure?.insee?.adresse?.libelle_commune ?? ''};${structureDepartement};${structureRegion};${coselec?.nombreConseillersCoselec};${formatDate(coselec)};${structure.type === 'PRIVATE' ? 'privée' : 'publique'};${structure.siret};${structure.codeDepartement};"${adresse}";${structure?.insee?.adresse?.code_commune};${structure.codePostal};${investissement.toString()};${structure.estZRR ? 'oui' : 'non'};${structure.qpvStatut ? structure.qpvStatut.toLowerCase() : 'Non défini'};${label};\n`);
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
