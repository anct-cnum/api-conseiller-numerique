#!/usr/bin/env node
'use strict';

const { execute } = require('../utils');
const { program } = require('commander');
const ExcelJS = require('exceljs'); // Lire du Excel
const fs = require('fs');
const path = require('path');
const xl = require('excel4node'); // Ecrire du Excel

program
.option('-r, --repertoire <repertoire>', 'répertoire')
.option('-v, --vague <vague>', 'vague')
.option('-w, --revision <revision>', 'révision')
.option('-f, --file <file>', 'Excel file path');

program.parse(process.argv);

// Liste des départements
const departements = require('./departements-region.json');
const deps = new Map();
for (const value of departements) {
  deps.set(String(value.num_dep), value);
}

const structures = [];

execute(async ({ db, logger }) => {
// Fichier Excel consolidé

  const codePostal2departementRegion = cp => {
    if (!/^.{5}$/.test(cp)) {
      return null;
    }
    let dep;
    if ((dep = cp.match(/^9[78]\d/))) {
      logger.info('DOM');
      logger.info(dep[0]);
      return deps.get(dep[0]);
    } else if ((dep = cp.match(/^20\d/))) {
      if (['200', '201'].includes(dep[0])) {
        logger.info('Corse du sud');
        return deps.get('2A');
      }
      if (['202', '206'].includes(dep[0])) {
        logger.info('Haute Corse');
        return deps.get('2B');
      }
      logger.info('Corse');
      logger.info(dep[0]);
    } else if ((dep = cp.match(/^\d\d/))) {
      logger.info('Le reste');
      logger.info(dep[0]);
      return deps.get(String(dep[0]));
    }
    return null;
  };


  const styleConf = {
    font: {
      name: 'Arial',
      color: '#3F58B7',
      size: 10,
    },
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

    ws.cell(1, 1, 1, 16, true)
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

    ws.cell(2, 1, 2, 16, true)
    .string('FICHIER PRÉFETS CONSOLIDÉ')
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

    ws.cell(3, 1, 4, 16, true)
    .string('')
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

    ws.cell(5, 1, 5, 16, true)
    .string('')
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


    ws.cell(6, 1, 6, 16, true)
    .string(program.revision ? `Version ${program.revision}` : '')
    .style(styleConf)
    .style({
      alignment: {
        horizontal: 'left'
      }
    });

    /*
    ws.cell(7, 1, 9, 1, true)
    .string('')
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
    .string('')
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
*/
    // Total des affectations
    ws.cell(12, 7, 12, 7, true)
    .string('')
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

    ws.column(6).setWidth(10);
    ws.cell(start, 6)
    .string('Département')
    .style(styleHeaderConf)
    .style(styleVertical);

    ws.column(7).setWidth(10);
    ws.cell(start, 7)
    .string('Région')
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

    ws.column(14).setWidth(22);
    ws.cell(start, 14)
    .string('Nombre de conseillers Coselec')
    .style(styleHeaderConf)
    .style(styleVertical);

    ws.column(15).setWidth(30);
    ws.cell(start, 15)
    .string('Avis Coselec')
    .style(styleHeaderConf)
    .style(styleVertical);

    ws.column(16).setWidth(20);
    ws.cell(start, 16)
    .string('Prioritaire')
    .style(styleHeaderConf)
    .style(styleVertical);

    ws.column(17).setWidth(20);
    ws.cell(start, 17)
    .string('Commentaire Coselec')
    .style(styleHeaderConf)
    .style(styleVertical);

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

    // Add all structures
    structures.forEach(function(s, i) {
      ws.row(i + start + 1).setHeight(30);
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
      .string(s.departement)
      .style(styleConf);

      ws.cell(i + start + 1, 7)
      .string(s.region)
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

      ws.cell(i + start + 1, 14)
      .number(s.nombreConseillers)
      .style({ numberFormat: '0' })
      .style(styleConf);

      ws.addDataValidation({
        type: 'whole',
        operator: 'between',
        allowBlank: true,
        prompt: 'Saisissez un nombre',
        error: 'Nombre obligatoire',
        sqref: `N${i + start + 1}:N${i + start + 1}`,
        formulas: [0, 500],
      });

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

      ws.cell(i + start + 1, 17)
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
        sqref: `O${i + start + 1}:O${i + start + 1}`,
        formulas: ['POSITIF,NÉGATIF'],
      });

      ws.addDataValidation({
        type: 'list',
        allowBlank: true,
        prompt: 'Choisissez dans la liste',
        error: 'Choix non valide',
        showDropDown: true,
        sqref: `P${i + start + 1}:P${i + start + 1}`,
        formulas: ['OUI,NON'],
      });

    });

    ws.column(3).freeze(4);
  };


  const createWorkbook = structures => {
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
    const ws1 = wb.addWorksheet('Structures');

    const confPubliques = {
      titre: 'PROGRAMME SOCIETE NUMERIQUE - ANCT',
      departement: `Département`,
      departementNumero: '',
      nombre: `Nombre de structures publiques candidates : ${structures.length}`,
      liste: 'Liste A : Structures publiques',
      accords: true
    };

    buildWorksheet(ws1, structures, confPubliques);

    return Promise.resolve(wb);
  };


  // Fin fichier Excel consolidé


  const processStructure = async s => {
    // On ne conserve que les avis positifs
    if (s.avis !== 'POSITIF') {
      return;
    }

    const match = await db.collection('structures').findOne({ idPG: s.id });
    // xxx mode dryrun pour valider le fichier Excel

    // Si on a un id
    if (match) {
      // On récupère le type de la structure
      s.type = match.type;
      const depReg = codePostal2departementRegion(String(match.codePostal));
      s.departement = depReg.dep_name;
      logger.info('Dep : ' + s.departement);
      s.region = depReg.region_name;
      //logger.info(`Type: ${s.type}`);
      structures.push(s);
      //      logger.info(
      //        `${result.matchedCount} document(s) matched the filter, updated ${result.modifiedCount} document(s)`,
      //      );
    } else if (s.siret && /^\d{14}$/.test(s.siret)) {
      // Si on a un siret
      const match = await db.collection('structures').findOne({ siret: s.siret.toString() });

      if (match) {
        // On récupère le type de la structure
        s.type = match.type;
        s.id = match.idPG;
        const depReg = codePostal2departementRegion(String(match.codePostal));
        s.departement = depReg.dep_name;
        logger.info('Dep : ' + s.departement);
        s.region = depReg.region_name;
        //logger.info(`Type2: ${s.type}`);
        structures.push(s);
        //        logger.info(
        //          `${result.matchedCount} document(s) matched the filter, updated ${result.modifiedCount} document(s)`,
        //       );
      }
    }
  };

  const readExcelForDep = async f => {
    logger.info(`Fichier : ${f}`);
    const start = 13; // Début de la liste des structures

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

    const workbookReader = new ExcelJS.stream.xlsx.WorkbookReader(f); // xxx utiliser le departement+version
    for await (const worksheetReader of workbookReader) {
      let i = 0;
      for await (const row of worksheetReader) {
        if (++i < start) {
          continue;
        }
        let id = row.getCell(ID).value;
        if (!/^\d+$/.test(id)) {
          //continue;
        }

        await processStructure({
          id: ~~row.getCell(ID).value,
          siret: row.getCell(SIRET).text,
          nom: row.getCell(NOM).text,
          codePostal: row.getCell(CODE_POSTAL).text,
          ville: row.getCell(VILLE).text,
          email: row.getCell(EMAIL).text,
          labelFranceServices: row.getCell(LABEL_FRANCE_SERVICES).value,
          nombreConseillers: row.getCell(NOMBRE_CONSEILLERS).value,
          avis: row.getCell(AVIS).value,
          commentaire: row.getCell(COMMENTAIRE).text,
        });
        //logger.info(`${row.getCell(ID).value} ${row.getCell(EMAIL).value} ${row.getCell(LABEL_FRANCE_SERVICES).value}
        //        ${row.getCell(NOMBRE_CONSEILLERS).value} ${row.getCell(AVIS).value} ${row.getCell(COMMENTAIRE).value}`);
      }
    }
  };

  //  const readExcelForAllDeps = async () => {
  //    for (const d of departements) {
  //      await readExcelForDep(d.num_dep);
  //    }
  //  };

  const writeExcel = async structures => {
    const wb = await createWorkbook(structures);
    const buffer = await wb.writeToBuffer();
    // xxx Réussir à se passer de la version synchrone
    await fs.writeFileSync(`prefets-consolide-vague-${program.vague}-version-${program.revision}.xlsx`, buffer, function(err) {
      if (err) {
        logger.info('Erreur ' + err);
        throw err;
      }
    });
  };

  if (program.repertoire) {
    const arrayOfFiles = fs.readdirSync(program.repertoire);
    logger.info(arrayOfFiles);
    logger.info(codePostal2departementRegion('977809'));
    logger.info(codePostal2departementRegion('97180'));
    logger.info(codePostal2departementRegion('20180'));
    logger.info(codePostal2departementRegion('20680'));
    logger.info(codePostal2departementRegion('44880'));
    for (const f of arrayOfFiles) {
      // Seulement les fichiers Excel en xlsx
      if (!/xlsx$/.test(f)) {
        continue;
      }
      await readExcelForDep(path.resolve(program.repertoire, f));
    }
    //logger.info(JSON.stringify(structures));
    logger.info(`${structures.length} structures`);
    await writeExcel(structures);
  } else {
    //await readExcelForAllDeps();
  }
});
