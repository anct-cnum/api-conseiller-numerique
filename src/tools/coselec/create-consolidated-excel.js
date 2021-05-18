#!/usr/bin/env node
'use strict';

const { execute } = require('../../utils');
const { program } = require('commander');
const ExcelJS = require('exceljs'); // Lire du Excel
const fs = require('fs');
const path = require('path');
const xl = require('excel4node'); // Ecrire du Excel

program
.option('-r, --repertoire <repertoire>', 'répertoire')
.option('-c, --coselec <coselec>', 'coselec')
.option('-v, --revision <revision>', 'révision');

program.parse(process.argv);

// Liste des départements
const departements = require('./departements-region.json');
const deps = new Map();
for (const value of departements) {
  deps.set(String(value.num_dep), value);
}

const structures = [];

execute(__filename, async ({ db, logger }) => {
// Fichier Excel consolidé

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


  let styleVert;
  let styleOrange;
  let styleRouge;

  const styleConf = {
    font: {
      name: 'Arial',
      color: '#3F58B7',
      size: 10,
    },
    alignment: {
      vertical: 'top',
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

  const buildWorksheet = (ws, structures) => {
    // List Header
    const start = 1;

    const styleVertical = {
      alignment: {
        vertical: 'center',
      }
    };

    ws.row(start).setHeight(30);

    ws.column(1).setWidth(13);
    ws.cell(start, 1)
    .string('Identifiant structure')
    .style(styleHeaderConf)
    .style(styleVertical);

    ws.column(2).setWidth(18);
    ws.cell(start, 2)
    .string('SIRET')
    .style(styleHeaderConf)
    .style(styleVertical);

    ws.column(3).setWidth(50);
    ws.cell(start, 3)
    .string('Nom Structure')
    .style(styleHeaderConf)
    .style(styleVertical);

    ws.column(4).setWidth(10);
    ws.cell(start, 4)
    .string('Type Structure')
    .style(styleHeaderConf)
    .style(styleVertical);

    ws.column(5).setWidth(10);
    ws.cell(start, 5)
    .string('Code postal')
    .style(styleHeaderConf)
    .style(styleVertical);

    ws.column(6).setWidth(20);
    ws.cell(start, 6)
    .string('Région')
    .style(styleHeaderConf)
    .style(styleVertical);

    ws.column(7).setWidth(20);
    ws.cell(start, 7)
    .string('Département')
    .style(styleHeaderConf)
    .style(styleVertical);

    ws.column(8).setWidth(20);
    ws.cell(start, 8)
    .string('Ville')
    .style(styleHeaderConf)
    .style(styleVertical);

    ws.column(9).setWidth(35);
    ws.cell(start, 9)
    .string('Email')
    .style(styleHeaderConf)
    .style(styleVertical);

    ws.column(10).setWidth(25);
    ws.cell(start, 10)
    .string('Labellisé France Services')
    .style(styleHeaderConf)
    .style(styleVertical);

    ws.column(11).setWidth(22);
    ws.cell(start, 11)
    .string('Nombre de conseillers')
    .style(styleHeaderConf)
    .style(styleVertical);

    ws.column(12).setWidth(30);
    ws.cell(start, 12)
    .string('Avis')
    .style(styleHeaderConf)
    .style(styleVertical);

    ws.column(13).setWidth(70);
    ws.cell(start, 13)
    .string('Si avis négatif ou examen complémentaire : Commentaires')
    .style(styleHeaderConf)
    .style(styleVertical);

    ws.column(14).setWidth(20);
    ws.cell(start, 14)
    .string('Observations')
    .style(styleHeaderConf)
    .style(styleVertical);

    ws.column(15).setWidth(20);
    ws.cell(start, 15)
    .string(`Existence d'un accord préaliable de principe`)
    .style(styleHeaderConf)
    .style(styleVertical);

    ws.column(16).setWidth(30);
    ws.cell(start, 16)
    .string('Avis Coselec')
    .style(styleHeaderConf)
    .style(styleVertical);

    ws.column(17).setWidth(22);
    ws.cell(start, 17)
    .string('Nombre de conseillers Coselec')
    .style(styleHeaderConf)
    .style(styleVertical);

    ws.column(18).setWidth(20);
    ws.cell(start, 18)
    .string('Prioritaire')
    .style(styleHeaderConf)
    .style(styleVertical);

    ws.column(19).setWidth(20);
    ws.cell(start, 19)
    .string('Date COSELEC')
    .style(styleHeaderConf)
    .style(styleVertical);

    ws.column(20).setWidth(50);
    ws.cell(start, 20)
    .string('Raison Sociale')
    .style(styleHeaderConf)
    .style(styleVertical);

    ws.column(21).setWidth(20);
    ws.cell(start, 21)
    .string('Commune INSEE')
    .style(styleHeaderConf)
    .style(styleVertical);

    ws.column(22).setWidth(20);
    ws.cell(start, 22)
    .string('Statut SA')
    .style(styleHeaderConf)
    .style(styleVertical);

    ws.column(23).setWidth(20);
    ws.cell(start, 23)
    .string('Coselec précédent')
    .style(styleHeaderConf)
    .style(styleVertical);

    ws.column(24).setWidth(20);
    ws.cell(start, 24)
    .string('Avis Coselec précédent')
    .style(styleHeaderConf)
    .style(styleVertical);

    ws.column(25).setWidth(20);
    ws.cell(start, 25)
    .string('ZRR')
    .style(styleHeaderConf)
    .style(styleVertical);

    // Formules

    ws.cell(start - 1, 11, start - 1, 11, true)
    .formula(`SUBTOTAL(109,K${start + 1}:K${start + structures.length})`)
    .style(styleConf)
    .style({
      font: {
      //color: '#FF0000',
        bold: true
      }
    })
    .style({ numberFormat: '0' });

    ws.cell(start - 1, 14, start - 1, 14, true)
    .formula(`SUBTOTAL(109,N${start + 1}:N${start + structures.length})`)
    .style(styleConf)
    .style({
      font: {
      //color: '#FF0000',
        bold: true
      }
    })
    .style({ numberFormat: '0' });

    ws.row(start).filter();

    // Fin des headers

    // Toutes les tructures
    structures.forEach(function(s, i) {
      let height = s.commentaire === '' ? 1 : Math.ceil(s.commentaire.length / 80);
      ws.row(i + start + 1).setHeight(height * 30);
      ws.cell(i + start + 1, 1)
      .string(String(s.id))
      .style(styleConf);

      ws.cell(i + start + 1, 2)
      .string(s.siret ? String(s.siret) : '')
      .style(styleConf);

      //ws.row(i + start + 1).setHeight(30);

      ws.cell(i + start + 1, 3)
      .string(s.nom)
      .style(styleConf)
      .style(
        {
          alignment: {
            wrapText: true,
          }
        });

      ws.cell(i + start + 1, 4)
      .string(s.type)
      .style(styleConf);

      ws.cell(i + start + 1, 5)
      .string(String(s.codePostal))
      .style(styleConf);

      ws.cell(i + start + 1, 6)
      .string(s.region)
      .style(styleConf);

      ws.cell(i + start + 1, 7)
      .string(s.departement)
      .style(styleConf);

      ws.cell(i + start + 1, 8)
      .string(s.ville ? s.ville : '')
      .style(styleConf);

      ws.cell(i + start + 1, 9)
      .string(s.email)
      .style(styleConf)
      .style(
        {
          alignment: {
            wrapText: true,
          }
        });

      ws.cell(i + start + 1, 10)
      .string(s.labelFranceServices || '')
      .style(styleConf);

      ws.addDataValidation({
        type: 'list',
        allowBlank: true,
        prompt: 'Choisissez dans la liste',
        error: 'Choix non valide',
        showDropDown: true,
        sqref: `J${i + start + 1}:J${i + start + 1}`,
        formulas: ['OUI,NON'],
      });

      ws.cell(i + start + 1, 11)
      .number(s.nombreConseillers)
      .style({ numberFormat: '0' })
      .style(styleConf);

      ws.addDataValidation({
        type: 'whole',
        operator: 'between',
        allowBlank: true,
        prompt: 'Saisissez un nombre',
        error: 'Nombre obligatoire',
        sqref: `K${i + start + 1}:K${i + start + 1}`,
        formulas: [0, 500],
      });

      ws.cell(i + start + 1, 12)
      .string(s.avis || '')
      .style(styleConf);

      ws.addDataValidation({
        type: 'list',
        allowBlank: true,
        prompt: 'Choisissez dans la liste',
        error: 'Choix non valide',
        showDropDown: true,
        sqref: `L${i + start + 1}:L${i + start + 1}`,
        formulas: ['POSITIF,NÉGATIF,EXAMEN COMPLÉMENTAIRE'],
      });

      ws.cell(i + start + 1, 13)
      .string(s.commentaire || '')
      .style(styleConf)
      .style(
        {
          alignment: {
            wrapText: true,
          }
        });

      // Observations
      ws.cell(i + start + 1, 14)
      .string('')
      .style(styleConf)
      .style(
        {
          alignment: {
            wrapText: true,
          }
        });

      // Existence d'un APP
      ws.cell(i + start + 1, 15)
      .string('')
      .style(styleConf)
      .style(
        {
          alignment: {
            wrapText: true,
          }
        });

      ws.cell(i + start + 1, 16)
      .string('')
      .style(styleConf)
      .style(
        {
          alignment: {
            wrapText: true,
          }
        });

      ws.addDataValidation({
        type: 'list',
        allowBlank: true,
        prompt: 'Choisissez dans la liste',
        error: 'Choix non valide',
        showDropDown: true,
        sqref: `P${i + start + 1}:P${i + start + 1}`,
        formulas: ['POSITIF,NÉGATIF,EXAMEN COMPLÉMENTAIRE'],
      });

      ws.cell(i + start + 1, 17)
      .number(s.nombreConseillers)
      .style({ numberFormat: '0' })
      .style(styleConf);

      ws.addDataValidation({
        type: 'whole',
        operator: 'between',
        allowBlank: true,
        prompt: 'Saisissez un nombre',
        error: 'Nombre obligatoire',
        sqref: `Q${i + start + 1}:Q${i + start + 1}`,
        formulas: [0, 500],
      });

      ws.cell(i + start + 1, 18)
      .string('')
      .style(styleConf)
      .style(
        {
          alignment: {
            wrapText: true,
          }
        });

      ws.addDataValidation({
        type: 'list',
        allowBlank: true,
        prompt: 'Choisissez dans la liste',
        error: 'Choix non valide',
        showDropDown: true,
        sqref: `R${i + start + 1}:R${i + start + 1}`,
        formulas: ['OUI,NON'],
      });

      ws.cell(i + start + 1, 19)
      .string('COSELEC ' + program.coselec)
      .style(styleConf)
      .style(
        {
          alignment: {
            wrapText: true,
          }
        });

      ws.cell(i + start + 1, 20)
      .string(s.raisonSociale)
      .style(styleConf)
      .style(
        {
          alignment: {
            wrapText: true,
          }
        });

      ws.cell(i + start + 1, 21)
      .string(s.communeInsee)
      .style(styleConf)
      .style(
        {
          alignment: {
            wrapText: true,
          }
        });

      ws.cell(i + start + 1, 22)
      .string(s.statut)
      .style(styleConf)
      .style(
        {
          alignment: {
            wrapText: true,
          }
        });

      ws.cell(i + start + 1, 23)
      .string(s?.coselecPrecedent?.numero ? s.coselecPrecedent.numero : '')
      .style(styleConf)
      .style(
        {
          alignment: {
            wrapText: true,
          }
        });

      ws.cell(i + start + 1, 24)
      .string(s?.coselecPrecedent?.avisCoselec ? s.coselecPrecedent.avisCoselec : '')
      .style(styleConf)
      .style(
        {
          alignment: {
            wrapText: true,
          }
        });

      let estZRR;

      if (s.hasOwnProperty('estZRR')) {
        estZRR = s.estZRR ? 'OUI' : 'NON';
      } else {
        estZRR = '';
      }

      ws.cell(i + start + 1, 25)
      .string(estZRR)
      .style(styleConf)
      .style(
        {
          alignment: {
            wrapText: true,
          }
        });

      // Fin des valeurs

      for (let j = 1; j < 19; j++) {
        let cell1 = xl.getExcelCellRef(i + start + 1, j);
        ws.addConditionalFormattingRule(cell1, {
          type: 'expression',
          priority: 1, // rule priority order (required)
          formula: `IF(AND(L${i + start + 1}="POSITIF",P${i + start + 1}="POSITIF"),1,0)`, // formula that returns nonzero or 0
          style: styleVert,
        });
        ws.addConditionalFormattingRule(cell1, {
          type: 'expression',
          priority: 2, // rule priority order (required)
          formula: `IF(L${i + start + 1}="EXAMEN COMPLÉMENTAIRE",1,0)`, // formula that returns nonzero or 0
          style: styleOrange,
        });
        ws.addConditionalFormattingRule(cell1, {
          type: 'expression',
          priority: 3, // rule priority order (required)
          formula: `IF(L${i + start + 1}="NÉGATIF",1,0)`, // formula that returns nonzero or 0
          style: styleRouge,
        });
      }
    });

    ws.column(3).freeze(4);
    ws.column(5).hide(); // Code postal
    ws.column(9).hide(); // Email

    // Couleur conditionnelle

  };


  const createWorkbook = structures => {
    const wb = new xl.Workbook({
      defaultFont: {
        size: 10,
        name: 'Arial',
        color: '00000000',
      },
      dateFormat: 'd/m/yy hh:mm:ss',
      workbookView: {
        activeTab: 0, // Specifies an unsignedInt that contains the index to the active sheet in this book view.
        firstSheet: 1, // Specifies the index to the first sheet in this book view.
        tabRatio: 600, // Specifies ratio between the workbook tabs bar and the horizontal scroll bar.
        windowHeight: 17620, // Specifies the height of the workbook window. The unit of measurement for this value is twips.
        windowWidth: 15000, // Specifies the width of the workbook window. The unit of measurement for this value is twips..
      },
      author: 'ANCT Conseiller Numérique',
    });

    styleVert = wb.createStyle({
      fill: {
        type: 'pattern',
        patternType: 'solid',
        bgColor: '#63BE7B',
        fgColor: '#63BE7B',
      },
    });

    styleOrange = wb.createStyle({
      fill: {
        type: 'pattern',
        patternType: 'solid',
        bgColor: '#FFEB84',
        fgColor: '#FFEB84',
      },
    });

    styleRouge = wb.createStyle({
      fill: {
        type: 'pattern',
        patternType: 'solid',
        bgColor: '#F8696B',
        fgColor: '#F8696B',
      },
    });

    // Add Worksheets to the workbook
    const ws1 = wb.addWorksheet('Structures', {
      'sheetView': {
        'zoomScale': 50, // Defaults to 100
        'zoomScaleNormal': 50, // Defaults to 100
        'zoomScalePageLayoutView': 50 // Defaults to 100
      }
    });

    buildWorksheet(ws1, structures);

    return Promise.resolve(wb);
  };

  // Fin fichier Excel consolidé

  const types = {
    'PRIVATE': 'Privée',
    'COMMUNE': 'Publique',
    'EPCI': 'Publique',
    'DEPARTEMENT': 'Publique',
    'REGION': 'Publique',
    'COLLECTIVITE': 'Publique',
  };

  const processStructure = async s => {
    // On ne conserve que les avis positifs
    //    if (s.avis !== 'POSITIF') {
    //      logger.info(`REJETEE,${s.id},${s.siret},${s.ligne},${s.fichier}`);
    //      return;
    //    }

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
      s.estZRR = match.estZRR;

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

      // Coselec précédent
      if (match.coselec && match.coselec.length > 0) {
        s.coselecPrecedent = match.coselec.slice(-1)[0];
      } else {
        s.coselecPrecedent = '';
      }

      structures.push(s);

      logger.info(`POSITIFID,${s.id},${s.siret},${s.ligne},${s.fichier}`);
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
        s.estZRR = match.estZRR;

        // Commune
        s.nomCommune = match.nomCommune;

        // Raison sociale
        s.raison_sociale = match?.insee?.entreprise?.raison_sociale ?
          match?.insee?.entreprise?.raison_sociale : '';

        // Commune INSEE
        s.communeInsee = match?.insee?.etablissement?.commune_implantation?.value ?
          match?.insee?.etablissement?.commune_implantation?.value : '';

        // Coselec précédent
        if (match.coselec && match.coselec.length > 0) {
          s.coselecPrecedent = match.coselec.slice(-1)[0];
        } else {
          s.coselecPrecedent = '';
        }

        structures.push(s);

        logger.info(`POSITIFSIRET,${s.id},${s.siret},${s.ligne},${s.fichier}`);
      } else {
        // Pour le moment, on garde telles quelles
        // les structures non inscrites
        // pour les laisser dans le fichier Coselec
        // Quand le fichier Coselec sera généré à partir de l'appli
        // ça ne sera plus possible
        structures.push(s);
        logger.info(`SIRETNONTROUVE,${s.id},${s.siret},${s.ligne},${s.fichier}`);
      }
    } else {
      // Pour le moment, on garde telles quelles
      // les structures non inscrites
      // pour les laisser dans le fichier Coselec
      // Quand le fichier Coselec sera généré à partir de l'appli
      // ça ne sera plus possible
      structures.push(s);
      logger.info(`INTROUVABLE,${s.id},${s.siret},${s.ligne},${s.fichier}`);
    }
  };

  const readExcelForDep = async f => {
    logger.info(`Fichier : ${f}`);

    // Colonnes Excel
    const ID = 1;
    const SIRET = 2;
    const NOM = 3;
    const CODE_POSTAL = 4;
    const VILLE = 5;
    const EMAIL = 6;
    const LABEL_FRANCE_SERVICES = 7;
    const NOMBRE_CONSEILLERS = 8;
    const AVIS = 9;
    const COMMENTAIRE = 10;

    const workbookReader = new ExcelJS.stream.xlsx.WorkbookReader(f);

    for await (const worksheetReader of workbookReader) {
      let i = 0;
      for await (const row of worksheetReader) {
        i++;
        let nom = row.getCell(NOM).text;

        // On cherche les lignes avec les vraies données
        if (nom === 'Nom Structure') {
          continue;
        }

        if (/^\s*$/.test(nom)) {
          continue;
        }

        await processStructure({
          fichier: f, // Nom du fichier, pour log et audit
          ligne: i + 1, // Ligne dans le fichier Excel, pour log et audit
          id: ~~row.getCell(ID).value,
          siret: row.getCell(SIRET).text,
          nom: row.getCell(NOM).text,
          codePostal: row.getCell(CODE_POSTAL).text,
          ville: row.getCell(VILLE).text,
          email: row.getCell(EMAIL).text,
          labelFranceServices: row.getCell(LABEL_FRANCE_SERVICES).value,
          nombreConseillers: ~~row.getCell(NOMBRE_CONSEILLERS).value,
          avis: row.getCell(AVIS).value,
          commentaire: row.getCell(COMMENTAIRE).text,
          type: '',
          departement: '',
          region: '',
        });
      }
    }
  };

  const writeExcel = async structures => {
    const wb = await createWorkbook(structures);
    const buffer = await wb.writeToBuffer();
    // xxx Réussir à se passer de la version synchrone
    await fs.writeFileSync(`prefets-coselec-${program.coselec}-version-${program.revision}.xlsx`, buffer, function(err) {
      if (err) {
        logger.warn('Erreur ' + err);
        throw err;
      }
    });
  };

  if (program.repertoire) {
    const arrayOfFiles = fs.readdirSync(program.repertoire);
    for (const f of arrayOfFiles) {
      // Seulement les fichiers Excel en xlsx
      if (!/xlsx$/.test(f)) {
        continue;
      }
      await readExcelForDep(path.resolve(program.repertoire, f));
    }
    logger.info(`${structures.length} structures`);
    await writeExcel(structures);
  }
});
