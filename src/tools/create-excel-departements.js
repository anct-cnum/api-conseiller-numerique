const fs = require('fs');
const path = require('path');
const xl = require('excel4node');
const { Pool } = require('pg');
const csv = require('csvtojson');
const { program } = require('commander');
program.version('0.0.1');

program
.option('-d, --departement <departement>', 'département')
.option('-v, --vague <vague>', 'vague')
.option('-f, --dotations <dotations>', 'CSV file path')
.option('-a, --accords <accords>', 'CSV file path');

program.parse(process.argv);

const departements = require('./departements-region.json');

const deps = new Map();

for (const value of departements) {
  deps.set(String(value.num_dep), value);
}

const dotations = new Map();
const accords = new Map();

const pool = new Pool();

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

const getStructures = async (departement, types) => {
  try {
    const { rows } = await pool.query('SELECT * FROM djapp_hostorganization WHERE SUBSTRING(zip_code,1,2) = $1 AND type = ANY ($2) ORDER BY id ASC',
      [departement, types.split(',')]);
    return rows;
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
  .string(conf.dotations && dotations.get(conf.departementNumero) ?
    `Nombre de dotations : ${dotations.get(conf.departementNumero)}` : '')
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

  ws.row(6).setHeight(30);

  ws.cell(6, 1, 6, 9, true)
  .string(conf.accords && accords.get(conf.departementNumero) ?
    `Accord préalable de principe : ${accords.get(conf.departementNumero)}` : '')
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

  ws.cell(8, 1, 10, 9, true)
  .string(`Si toutefois vous identifiez d'autres structures pouvant intégrer le dispositif conseiller numérique,\nmerci de les inviter à ` +
    `s'inscrire directement sur le site https://www.conseiller-numérique.gouv.fr. Merci de ne pas les ajouter dans ce fichier.`)
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

  ws.cell(11, 1, 11, 9, true)
  .string('Le fichier est à retourner au plus tard le 19/02/2021 à xxx@xxx.gouv.fr')
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

  // Dotations
  if (conf.dotations && dotations.get(conf.departementNumero)) {
    ws.cell(13, 7, 13, 7, true)
    .string('Nombre de dotations :')
    .style(styleConf)
    .style({
      font: {
        //color: '#FF0000',
        bold: true
      },
      alignment: {
        horizontal: 'right'
      }
    });

    ws.cell(13, 8, 13, 8, true)
    .number(dotations.get(conf.departementNumero))
    .style(styleConf)
    .style({
      font: {
        //color: '#FF0000',
        bold: true
      }
    });
  }

  // Total des affectations
  ws.cell(14, 7, 14, 7, true)
  .string('Nombre d\'affectations :')
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

  const start = 15;

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
  .string('Labellisé France Services')
  .style(styleHeaderConf)
  .style(styleVertical);

  ws.column(8).setWidth(22);
  ws.cell(start, 8)
  .string('Nombre de conseillers')
  .style(styleHeaderConf)
  .style(styleVertical);

  ws.column(9).setWidth(30);
  ws.cell(start, 9)
  .string('Avis')
  .style(styleHeaderConf)
  .style(styleVertical);

  ws.column(10).setWidth(70);
  ws.cell(start, 10)
  .string('Si avis négatif ou examen complémentaire : Commentaires')
  .style(styleHeaderConf)
  .style(styleVertical);

  ws.cell(start - 1, 8, start - 1, 8, true)
  .formula(`SUM(H${start + 1}:H${start + structures.length})`)
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
    .style(styleConf);

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
      });

    ws.cell(i + start + 1, 7)
    .string('')
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

    ws.cell(i + start + 1, 8)
    .number(0)
    .style({ numberFormat: '0' })
    .style(styleConf);

    ws.addDataValidation({
      type: 'whole',
      operator: 'between',
      allowBlank: true,
      prompt: 'Saisissez un nombre',
      error: 'Nombre obligatoire',
      sqref: `H${i + start + 1}:H${i + start + 1}`,
      formulas: [0, 500],
    });

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
      formulas: ['POSITIF,NÉGATIF,EXAMEN COMPLÉMENTAIRE'],
    });

    ws.cell(i + start + 1, 10)
    .string('')
    .style(styleConf)
    .style(
      {
        alignment: {
          wrapText: true,
        }
      });
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
    dotations: true,
    accords: true
  };

  const confPrivees = {
    titre: 'PROGRAMME SOCIETE NUMERIQUE - ANCT',
    departement: `Département ${departement} ${deps.get(String(departement)).dep_name}`,
    departementNumero: String(departement),
    nombre: `Nombre de structures privées candidates : ${structuresPrivees.length}`,
    liste: 'Liste B : Structures privées',
  };

  buildWorksheet(ws1, structuresPubliques, confPubliques);
  buildWorksheet(ws2, structuresPrivees, confPrivees);

  return Promise.resolve(wb);
};

const createExcelForDep = async departement => {
  const structuresPrivees = await getStructures(departement, 'PRIVATE');
  const structuresPubliques = await getStructures(departement, 'COLLECTIVITE,COMMUNE,EPCI,DEPARTEMENT,REGION');
  const wb = await createWorkbook(departement, structuresPubliques, structuresPrivees);
  wb.write(`conseiller-numerique-${departement}-${deps.get(String(departement)).dep_name.replace(' ', '-')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')}-vague-${program.vague}.xlsx`);
};

const createExcelForAllDeps = async () => {
  for (const d of departements) {
    await createExcelForDep(d.num_dep);
  }
};

(async () => {
  if (program.dotations) {
    const dotationsCSV = await csv().fromFile(program.dotations);
    for (const d of dotationsCSV) {
      dotations.set(String(d['departement']), ~~d['dotation']);
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
})();


