#!/usr/bin/env node
'use strict';

const { execute } = require('../utils');
const fs = require('fs');
const path = require('path');
const xl = require('excel4node');
const { Pool } = require('pg');
const csv = require('csvtojson');
const { program } = require('commander');
const utils = require('../../utils/index.js');

program
.option('-d, --departement <departement>', 'département')
.option('-v, --vague <vague>', 'vague')
.option('-w, --revision <revision>', 'révision')
.option('-r, --referents <referents>', 'CSV file path')
.option('-a, --accords <accords>', 'CSV file path');

program.parse(process.argv);

const departements = require('./departements-region.json');

const deps = new Map();

for (const value of departements) {
  deps.set(String(value.num_dep), value);
}

const referents = new Map();
const accords = new Map();

const pool = new Pool();

let doublonsSiret;
let doublonsSiretEtEmail;

const types = {
  'PRIVATE': 'Privée',
  'COMMUNE': 'Publique',
  'EPCI': 'Publique',
  'DEPARTEMENT': 'Publique',
  'REGION': 'Publique',
  'COLLECTIVITE': 'Publique',
  'GIP': 'Publique',
};

const styleConf = {
  font: {
    name: 'Arial',
    color: '#3F58B7',
    size: 10,
  },
  alignment: {
    vertical: 'top'
  }
};

const styleHeaderConf = {
  font: {
    name: 'Arial',
    color: '#3F58B7',
    size: 10,
    bold: true,
  },
  alignment: {
    wrapText: true,
    horizontal: 'center',
  },
  fill: {
    type: 'pattern', // Currently only 'pattern' is implemented. Non-implemented option is 'gradient'
    patternType: 'solid', //§18.18.55 ST_PatternType (Pattern Type)
    bgColor: '#E9EDF7', // HTML style hex value. defaults to black
    fgColor: '#E9EDF7', // HTML style hex value. defaults to black
  }
};

execute(__filename, async ({ db }) => {
  // Liste des départements
  const departements = require('./departements-region.json');
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

  const isDoublonSiretEtEmail = (siret, email) => {
    return doublonsSiretEtEmail.some(doublon => doublon.siret === siret && doublon.contact_email === email);
  };

  const isDoublonSiret = siret => {
    return doublonsSiret.some(doublon => doublon.siret === siret);
  };

  const getStructureMongo = async s => {
    const match = await db.collection('structures').findOne({ idPG: s.id });

    // Si on a un id
    if (match) {
      // On récupère le type de la structure
      s.type = types[match.type] ? types[match.type] : '';

      // Département et région
      const depReg = codePostal2departementRegion(String(match.codePostal));
      s.departement = depReg.dep_name;
      s.region = depReg.region_name;

      // Siret
      s.siret = match.siret;

      // Statut
      s.statut = match.statut;

      // ZRR
      s.estZRR = match.estZRR ? 'OUI' : 'NON';

      // QVP
      s.qpvStatut = match.qpvStatut ? match.qpvStatut.toUpperCase() : '';
      s.qpvListe = match.qpvListe;

      // Commune
      s.nomCommune = match.nomCommune;

      // France Services
      s.estLabelliseFranceServices = match.estLabelliseFranceServices;

      // Raison sociale
      s.raisonSociale = match?.insee?.entreprise?.raison_sociale ?
        match?.insee?.entreprise?.raison_sociale : '';

      // Commune INSEE
      s.communeInsee = match?.insee?.etablissement?.commune_implantation?.value ?
        match?.insee?.etablissement?.commune_implantation?.value : '';

      // Cherche le bon Coselec précédent
      s.coselecPrecedent = utils.getCoselec(match) || '';

      // Infos fichiers préfets précédents
      s.prefet = match?.prefet;

      return s;
    } else if (s.siret && /^\d{14}$/.test(s.siret)) {
      // Si on a un siret
      const match = await db.collection('structures').findOne({ siret: s.siret.toString() });

      if (match) {
        // On récupère le type de la structure
        s.type = types[match.type] ? types[match.type] : '';

        // On récupère l'id Postgres
        s.id = match.idPG;

        // Département et région
        const depReg = codePostal2departementRegion(String(match.codePostal));
        s.departement = depReg.dep_name;
        s.region = depReg.region_name;

        // Statut
        s.statut = match.statut;

        // ZRR
        s.estZRR = match.estZRR ? 'OUI' : 'NON';

        // QVP
        s.qpvStatut = match.qpvStatut ? match.qpvStatut.toUpperCase() : '';
        s.qpvListe = match.qpvListe;

        // Commune
        s.nomCommune = match.nomCommune;

        // Raison sociale
        s.raison_sociale = match?.insee?.entreprise?.raison_sociale ?
          match?.insee?.entreprise?.raison_sociale : '';

        // Commune INSEE
        s.communeInsee = match?.insee?.etablissement?.commune_implantation?.value ?
          match?.insee?.etablissement?.commune_implantation?.value : '';

        // Cherche le bon Coselec précédent
        s.coselecPrecedent = utils.getCoselec(match) || '';

        // Infos fichiers préfets précédents
        s.prefet = match?.prefet;

        return s;
      } else {
        // Pour le moment, on garde telles quelles
        // les structures non inscrites
        // pour les laisser dans le fichier Coselec
        // Quand le fichier Coselec sera généré à partir de l'appli
        // ça ne sera plus possible
        return s;
      }
    } else {
      // Pour le moment, on garde telles quelles
      // les structures non inscrites
      // pour les laisser dans le fichier Coselec
      // Quand le fichier Coselec sera généré à partir de l'appli
      // ça ne sera plus possible
      return s;
    }
  };

  const getDoublonsSiret = async () => {
    let query = `SELECT siret, departement_code, COUNT(*)
      FROM djapp_hostorganization
      GROUP BY
        siret, departement_code
      HAVING
        COUNT(*) > 1`;

    try {
      const { rows } = await pool.query(query, []);
      return rows;
    } catch (error) {
      console.log(`Erreur DB : ${error.message}`);
    }
  };

  const getDoublonsSiretEtEmail = async () => {
    let query = `SELECT siret, contact_email, departement_code, COUNT(*)
      FROM djapp_hostorganization
      GROUP BY
        siret, contact_email, departement_code
      HAVING
        COUNT(*) > 1`;

    try {
      const { rows } = await pool.query(query, []);
      return rows;
    } catch (error) {
      console.log(`Erreur DB : ${error.message}`);
    }
  };

  const getStructures = async (departement, types) => {
    let query;
    if (departement === '2A') {
    // Corse du Sud
      query = 'SELECT * FROM djapp_hostorganization WHERE (SUBSTRING(zip_code,1,3) = \'200\' OR' +
      ' SUBSTRING(zip_code,1,3) = \'201\') AND type = ANY ($2) AND $1=$1 ORDER BY id ASC';
    } else if (departement === '2B') {
    // Haute-Corse
      query = 'SELECT * FROM djapp_hostorganization WHERE (SUBSTRING(zip_code,1,3) = \'202\' OR' +
      ' SUBSTRING(zip_code,1,3) = \'206\') AND type = ANY ($2) AND $1=$1 ORDER BY id ASC';
    } else if (/^\d\d\d$/.test(departement)) {
    // DOM sur 3 chiffres
      query = 'SELECT * FROM djapp_hostorganization WHERE SUBSTRING(zip_code,1,3) = $1 AND type = ANY ($2) ORDER BY id ASC';
    } else if (/^\d\d$/.test(departement)) {
    // Les autres sur 2 chiffres
      query = 'SELECT * FROM djapp_hostorganization WHERE SUBSTRING(zip_code,1,2) = $1 AND type = ANY ($2) ORDER BY id ASC';
    }

    try {
      const { rows } = await pool.query(query,
        [departement, types.split(',')]);

      // Données de Mongo

      let structuresEnrichies = [];

      for (const s of rows) {
        let sm = await getStructureMongo(s);

        if (['CREEE', 'VALIDATION_COSELEC'].includes(sm.statut) &&
          !sm.name.includes('CROIX ROUGE FRANCAISE') &&
            !sm.name.includes('(GROUPE SOS)') &&
              !sm.name.includes('EMMAUS CONNECT')) {
          structuresEnrichies.push(sm);
        }
      }

      // Classement des structures dans l'ordre suivant :
      // AVIS POSITIF - AVIS NEGATIF - EXAMEN COMPLEMENTAIRE - NOUVELLES STRUCTURES
      const ordre = ['POSITIF', 'NÉGATIF', 'EXAMEN COMPLÉMENTAIRE', 'DOUBLON', ''];

      structuresEnrichies.sort((a, b) => {
        const aAP = a.prefet && a.prefet.length > 0 ? a.prefet[a.prefet.length - 1].avisPrefet : '';
        const bAP = b.prefet && b.prefet.length > 0 ? b.prefet[b.prefet.length - 1].avisPrefet : '';
        return ordre.indexOf(aAP) - ordre.indexOf(bAP);
      });

      return structuresEnrichies;
    } catch (error) {
      console.log(`Erreur DB : ${error.message} pour le département ${departement}`);
    }
  };


  const buildWorksheet = (ws, structures, conf) => {
    ws.addImage({
      image: fs.readFileSync(path.resolve(__dirname, './logo-cn.jpg')),
      type: 'picture',
      position: {
        type: 'twoCellAnchor',
        from: {
          col: 1,
          colOff: 0,
          row: 1,
          rowOff: 0,
        },
        to: {
          col: 3,
          colOff: 0,
          row: 5,
          rowOff: 0,
        },
      },
    });

    ws.cell(1, 1, 1, 9, true)
    .string(conf.titre)
    .style(styleConf)
    .style(
      {
        font: {
          size: 14,
          bold: true,
        },
        alignment: {
          wrapText: true,
          horizontal: 'center',
          vertical: 'center',
        },
        fill: { // §18.8.20 fill (Fill)
          type: 'pattern', // Currently only 'pattern' is implemented. Non-implemented option is 'gradient'
          patternType: 'solid', //§18.18.55 ST_PatternType (Pattern Type)
          bgColor: '#E9EDF7', // HTML style hex value. defaults to black
          fgColor: '#E9EDF7' // HTML style hex value. defaults to black.
        }
      });


    // Doc title
    ws.row(1).setHeight(30);

    ws.cell(2, 1, 2, 9, true)
    .string(conf.departement)
    .style(styleConf)
    .style(
      {
        font: {
        //color: '#000091',
          size: 14,
          bold: true,
        },
        alignment: {
          wrapText: true,
          horizontal: 'center',
        },
        fill: { // §18.8.20 fill (Fill)
          type: 'pattern', // Currently only 'pattern' is implemented. Non-implemented option is 'gradient'
          patternType: 'solid', //§18.18.55 ST_PatternType (Pattern Type)
          bgColor: '#E9EDF7', // HTML style hex value. defaults to black
          fgColor: '#E9EDF7' // HTML style hex value. defaults to black.
        }
      });

    ws.cell(3, 1, 4, 9, true)
    .string(conf.nombre)
    .style(
      {
        font: {
          size: 14,
          bold: true,
        },
        alignment: {
          wrapText: true,
          horizontal: 'center',
          vertical: 'center',
        },
        fill: { // §18.8.20 fill (Fill)
          type: 'pattern', // Currently only 'pattern' is implemented. Non-implemented option is 'gradient'
          patternType: 'solid', //§18.18.55 ST_PatternType (Pattern Type)
          bgColor: '#E9EDF7', // HTML style hex value. defaults to black
          fgColor: '#E9EDF7' // HTML style hex value. defaults to black.
        }
      });

    ws.row(5).setHeight(30);

    ws.cell(5, 1, 5, 9, true)
    .string(conf.accords && accords.get(conf.departementNumero) ?
      `Accord préalable de principe : ${accords.get(conf.departementNumero)} Conseillers numériques` : '')
    .style(
      {
        font: {
          size: 14,
          bold: true,
        },
        alignment: {
          wrapText: true,
          horizontal: 'center',
          vertical: 'center',
        },
        fill: { // §18.8.20 fill (Fill)
          type: 'pattern', // Currently only 'pattern' is implemented. Non-implemented option is 'gradient'
          patternType: 'solid', //§18.18.55 ST_PatternType (Pattern Type)
          bgColor: '#E9EDF7', // HTML style hex value. defaults to black
          fgColor: '#E9EDF7' // HTML style hex value. defaults to black.
        }
      });


    ws.cell(6, 1, 6, 9, true)
    .string(program.revision ? `Version ${program.revision}` : '')
    .style(styleConf)
    .style({
      alignment: {
        horizontal: 'left'
      }
    });

    ws.cell(7, 1, 9, 9, true)
    .string(`Si toutefois vous identifiez d'autres structures pouvant intégrer le dispositif conseiller numérique,\nmerci de les inviter à ` +
    `s'inscrire directement sur le site https://www.conseiller-numérique.gouv.fr. Merci de les ajouter dans ce fichier.`)
    .style(styleConf)
    .style({
      font: {
        color: '#E1000F',
        bold: true
      },
      alignment: {
        horizontal: 'center',
        vertical: 'center',
        wrapText: true,
      }
    });

    ws.cell(10, 1, 10, 9, true)
    .string(`Le fichier est à retourner à conseiller-numerique@anct.gouv.fr, copie votre ` +
    `${referents.get(conf.departementNumero).sexe === 'f' ? 'référente' : 'référent'} ${referents.get(conf.departementNumero).email}`)
    .style(styleConf)
    .style({
      font: {
      //color: '#FF0000',
        bold: true
      },
      alignment: {
        horizontal: 'center',
        vertical: 'center',
        wrapText: true,
      }
    });

    // Total des affectations
    ws.cell(14, 9, 14, 9, true)
    .string('Nombre d\'affectations total :')
    .style(styleConf)
    .style({
      font: {
      //color: '#FF0000',
      //bold: true
      },
      alignment: {
        horizontal: 'right'
      }
    });

    // List Header

    const start = 13;

    const styleVertical = {
      alignment: {
        vertical: 'center',
      }
    };

    ws.row(start).setHeight(30);

    ws.column(1).setWidth(10);
    ws.cell(start, 1)
    .string('Identifiant structure')
    .style(styleHeaderConf)
    .style(styleVertical);

    ws.column(2).setWidth(20);
    ws.cell(start, 2)
    .string('SIRET')
    .style(styleHeaderConf)
    .style(styleVertical);

    ws.column(3).setWidth(60);
    ws.cell(start, 3)
    .string('Nom Structure')
    .style(styleHeaderConf)
    .style(styleVertical);

    ws.column(4).setWidth(10);
    ws.cell(start, 4)
    .string('Code postal')
    .style(styleHeaderConf)
    .style(styleVertical);

    ws.column(5).setWidth(20);
    ws.cell(start, 5)
    .string('Ville')
    .style(styleHeaderConf)
    .style(styleVertical);

    ws.column(6).setWidth(35);
    ws.cell(start, 6)
    .string('Email')
    .style(styleHeaderConf)
    .style(styleVertical);

    ws.column(7).setWidth(25);
    ws.cell(start, 7)
    .string('Intervention en France services')
    .style(styleHeaderConf)
    .style(styleVertical);

    ws.column(8).setWidth(20);
    ws.cell(start, 8)
    .string('Intervention en ZRR')
    .style(styleHeaderConf)
    .style(styleVertical);

    ws.column(9).setWidth(20);
    ws.cell(start, 9)
    .string('Intervention en QPV')
    .style(styleHeaderConf)
    .style(styleVertical);

    ws.column(10).setWidth(20);
    ws.cell(start, 10)
    .string('Si OUI Code QPV (8 chiffres)')
    .style(styleHeaderConf)
    .style(styleVertical);

    ws.column(11).setWidth(20);
    ws.cell(start, 11)
    .string('Nom du quartier')
    .style(styleHeaderConf)
    .style(styleVertical);

    ws.column(12).setWidth(22);
    ws.cell(start, 12)
    .string('Nombre de conseillers demandés')
    .style(styleHeaderConf)
    .style(styleVertical);

    ws.column(13).setWidth(30);
    ws.cell(start, 13)
    .string('Avis Préfecture')
    .style(styleHeaderConf)
    .style(styleVertical);

    ws.column(14).setWidth(70);
    ws.cell(start, 14)
    .string('Commentaire de la Préfecture pour justifier l\'avis donné')
    .style(styleHeaderConf)
    .style(styleVertical);

    ws.column(15).setWidth(22);
    ws.cell(start, 15)
    .string('Nombre de conseillers COSELEC')
    .style(styleHeaderConf)
    .style(styleVertical);

    ws.column(16).setWidth(30);
    ws.cell(start, 16)
    .string('Avis COSELEC')
    .style(styleHeaderConf)
    .style(styleVertical);

    ws.cell(start - 1, 12, start - 1, 12, true)
    .formula(`SUM(L${start + 1}:L${start + structures.length})`)
    .style(styleConf)
    .style({
      font: {
      //color: '#FF0000',
        bold: true
      }
    })
    .style({ numberFormat: '0' });

    // Add all structures
    structures.forEach(function(s, i) {
      ws.cell(i + start + 1, 1)
      .string(String(s.id))
      .style(styleConf);

      ws.cell(i + start + 1, 2)
      .string(s.siret || '')
      .style(styleConf)
      .style({
        font: {
          //color: '#FF0000',
          bold: isDoublonSiretEtEmail(s.siret, s.contact_email) || isDoublonSiret(s.siret)
        }
      });

      //ws.row(i + start + 1).setHeight(30);

      ws.cell(i + start + 1, 3)
      .string(s.name)
      .style(styleConf)
      .style(
        {
          alignment: {
            wrapText: true,
          }
        });

      ws.cell(i + start + 1, 4)
      .string(s.zip_code)
      .style(styleConf);

      ws.cell(i + start + 1, 5)
      .string(s.geo_name)
      .style(styleConf);

      ws.cell(i + start + 1, 6)
      .string(s.contact_email)
      .style(styleConf)
      .style(
        {
          alignment: {
            wrapText: true,
          }
        })
      .style({
        font: {
          //color: '#FF0000',
          bold: isDoublonSiretEtEmail(s.siret, s.contact_email)
        }
      });

      ws.cell(i + start + 1, 7)
      .string(s.estLabelliseFranceServices ?? '')
      .style(styleConf);

      ws.addDataValidation({
        type: 'list',
        allowBlank: true,
        prompt: 'Choisissez dans la liste',
        error: 'Choix non valide',
        showDropDown: true,
        sqref: `G${i + start + 1}:G${i + start + 1}`,
        formulas: ['OUI,NON'],
      });

      // ZRR
      ws.cell(i + start + 1, 8)
      .string('')
      .style(styleConf);

      ws.addDataValidation({
        type: 'list',
        allowBlank: true,
        prompt: 'Choisissez dans la liste',
        error: 'Choix non valide',
        showDropDown: true,
        sqref: `H${i + start + 1}:H${i + start + 1}`,
        formulas: ['OUI,NON'],
      });

      // QPV
      ws.cell(i + start + 1, 9)
      .string('')
      .style(styleConf);

      ws.addDataValidation({
        type: 'list',
        allowBlank: true,
        prompt: 'Choisissez dans la liste',
        error: 'Choix non valide',
        showDropDown: true,
        sqref: `I${i + start + 1}:I${i + start + 1}`,
        formulas: ['OUI,NON'],
      });

      ws.cell(i + start + 1, 10)
      .string('')
      .style(styleConf);

      ws.cell(i + start + 1, 11)
      .string('')
      .style(styleConf);

      ws.cell(i + start + 1, 12)
      .number(s.prefet && s.prefet.length > 0 ? s.prefet[s.prefet.length - 1].nombreConseillersPrefet : 0)
      .style({ numberFormat: '0' })
      .style(styleConf);

      ws.addDataValidation({
        type: 'whole',
        operator: 'between',
        allowBlank: true,
        prompt: 'Saisissez un nombre',
        error: 'Nombre obligatoire',
        sqref: `L${i + start + 1}:L${i + start + 1}`,
        formulas: [0, 500],
      });

      ws.cell(i + start + 1, 13)
      .string(s.prefet && s.prefet.length > 0 ? s.prefet[s.prefet.length - 1].avisPrefet : '')
      .style(styleConf);

      ws.addDataValidation({
        type: 'list',
        allowBlank: true,
        prompt: 'Choisissez dans la liste',
        error: 'Choix non valide',
        showDropDown: true,
        sqref: `M${i + start + 1}:M${i + start + 1}`,
        formulas: ['POSITIF,NÉGATIF,EXAMEN COMPLÉMENTAIRE,DOUBLON'],
      });

      ws.cell(i + start + 1, 14)
      .string(s.prefet && s.prefet.length > 0 ? s.prefet[s.prefet.length - 1].commentairePrefet : '')
      .style(styleConf)
      .style(
        {
          alignment: {
            wrapText: true,
          }
        });

      // Coselec

      ws.cell(i + start + 1, 15)
      .number(s.coselecPrecedent ? s.coselecPrecedent.nombreConseillersCoselec : 0)
      .style({ numberFormat: '0' })
      .style(styleConf);

      ws.cell(i + start + 1, 16)
      .string(s.coselecPrecedent ? s.coselecPrecedent.avisCoselec : '')
      .style(styleConf);
    });
  };

  const createWorkbook = (departement, structuresPubliques, structuresPrivees) => {
    const wb = new xl.Workbook({
      defaultFont: {
        size: 10,
        name: 'Arial',
        color: '00000000',
      },
      dateFormat: 'm/d/yy hh:mm:ss',
      workbookView: {
        activeTab: 0, // Specifies an unsignedInt that contains the index to the active sheet in this book view.
        firstSheet: 1, // Specifies the index to the first sheet in this book view.
        tabRatio: 600, // Specifies ratio between the workbook tabs bar and the horizontal scroll bar.
        windowHeight: 17620, // Specifies the height of the workbook window. The unit of measurement for this value is twips.
        windowWidth: 15000, // Specifies the width of the workbook window. The unit of measurement for this value is twips..
      },
      author: 'ANCT Conseiller Numérique',
    });

    // Add Worksheets to the workbook
    const ws1 = wb.addWorksheet('Liste A - Structures publiques');
    const ws2 = wb.addWorksheet('Liste B - Structures privées');

    const confPubliques = {
      titre: 'PROGRAMME SOCIETE NUMERIQUE - ANCT',
      departement: `Département ${departement} ${deps.get(String(departement)).dep_name}`,
      departementNumero: String(departement),
      nombre: `Nombre de structures publiques candidates : ${structuresPubliques.length}`,
      liste: 'Liste A : Structures publiques',
      accords: true
    };

    const confPrivees = {
      titre: 'PROGRAMME SOCIETE NUMERIQUE - ANCT',
      departement: `Département ${departement} ${deps.get(String(departement)).dep_name}`,
      departementNumero: String(departement),
      nombre: `Nombre de structures privées candidates : ${structuresPrivees.length}`,
      liste: 'Liste B : Structures privées',
      accords: true
    };

    buildWorksheet(ws1, structuresPubliques, confPubliques);
    buildWorksheet(ws2, structuresPrivees, confPrivees);

    return Promise.resolve(wb);
  };

  const createExcelForDep = async departement => {
    const structuresPrivees = await getStructures(departement, 'PRIVATE');
    const structuresPubliques = await getStructures(departement, 'COLLECTIVITE,COMMUNE,EPCI,DEPARTEMENT,REGION,GIP');
    const wb = await createWorkbook(departement, structuresPubliques, structuresPrivees);
    wb.write(`conseiller-numerique-${departement}-${deps.get(String(departement)).dep_name.replace(' ', '-')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')}-vague-${program.vague}-version-${program.revision}.xlsx`);
  };

  const createExcelForAllDeps = async () => {
    for (const d of departements) {
      await createExcelForDep(d.num_dep);
    }
  };

  doublonsSiret = await getDoublonsSiret();
  doublonsSiretEtEmail = await getDoublonsSiretEtEmail();

  if (program.referents) {
    const referentsCSV = await csv().fromFile(program.referents);
    for (const r of referentsCSV) {
      referents.set(String(r['departement']),
        { 'email': r['email'],
          'sexe': r['sexe']
        });
    }
  }

  if (program.accords) {
    const accordsCSV = await csv().fromFile(program.accords);
    for (const a of accordsCSV) {
      accords.set(String(a['departement']), ~~a['accord']);
    }
  }

  if (program.departement) {
    await createExcelForDep(program.departement);
  } else {
    await createExcelForAllDeps();
  }
});


