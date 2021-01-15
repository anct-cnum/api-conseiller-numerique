const xl = require('excel4node');
const { Pool } = require('pg');
const { program } = require('commander');
program.version('0.0.1');

program
.option('-d, --departement <departement>', 'département')
.option('-v, --vague <vague>', 'vague');

program.parse(process.argv);

const departements = require('./departements-region.json');

const deps = new Map();

for (const value of departements) {
  deps.set(String(value.num_dep), value);
}

const validation = Array.from({ length: 250 }, (_, i) => `${++i}`).join(','); // '1,2,3,..,250'

const pool = new Pool();

const styleConf = {
  font: {
    color: '#073763',
    size: 12,
  },
};

const styleHeaderConf = {
  font: {
    color: '#FFFFFF',
    size: 11,
    bold: true,
  },
  alignment: {
    wrapText: true,
    horizontal: 'center',
  },
  fill: {
    type: 'pattern', // Currently only 'pattern' is implemented. Non-implemented option is 'gradient'
    patternType: 'solid', //§18.18.55 ST_PatternType (Pattern Type)
    bgColor: '#0B5394', // HTML style hex value. defaults to black
    fgColor: '#0B5394' // HTML style hex value. defaults to black.
  }
};

const getStructures = async (departement, types) => {
  try {
    const { rows } = await pool.query('SELECT * FROM djapp_hostorganization WHERE departement_code = $1 AND type = ANY ($2) ORDER BY id ASC',
      [departement, types.split(',')]);
    return rows;
  } catch (error) {
    console.log(`Erreur DB : ${error.message} pour le département ${departement}`);
  }
};

const buildWorksheet = (ws, structures, conf) => {
  ws.cell(1, 1, 2, 6, true)
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
        vertical: 'top',
      },
      fill: { // §18.8.20 fill (Fill)
        type: 'pattern', // Currently only 'pattern' is implemented. Non-implemented option is 'gradient'
        patternType: 'solid', //§18.18.55 ST_PatternType (Pattern Type)
        bgColor: '#EFEFEF', // HTML style hex value. defaults to black
        fgColor: '#EFEFEF' // HTML style hex value. defaults to black.
      }
    });


  // Doc title
  ws.row(1).setHeight(30);

  ws.cell(3, 1, 3, 6, true)
  .string(conf.departement)
  .style(
    {
      font: {
        color: '#4A86E8',
        size: 14,
      },
      alignment: {
        wrapText: true,
        horizontal: 'center',
      },
      fill: { // §18.8.20 fill (Fill)
        type: 'pattern', // Currently only 'pattern' is implemented. Non-implemented option is 'gradient'
        patternType: 'solid', //§18.18.55 ST_PatternType (Pattern Type)
        bgColor: '#EFEFEF', // HTML style hex value. defaults to black
        fgColor: '#EFEFEF' // HTML style hex value. defaults to black.
      }
    });

  ws.cell(4, 1, 5, 6, true)
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
        bgColor: '#EFEFEF', // HTML style hex value. defaults to black
        fgColor: '#EFEFEF' // HTML style hex value. defaults to black.
      }
    });

  ws.cell(6, 1)
  .string(conf.liste)
  .style(styleConf)
  .style({
    font: {
      bold: true
    }
  });

  ws.cell(8, 1, 8, 5, true)
  .string('Les nouvelles structures doivent s\'inscrire sur  https://www.conseiller-numerique.gouv.fr, merci de ne pas les ajouter dans ce fichier.')
  .style(styleConf)
  .style({
    font: {
      color: '#FF0000',
      bold: true
    }
  });

  // List Header

  const start = 10;

  ws.row(start).setHeight(30);

  ws.column(1).setWidth(10);
  ws.cell(start, 1)
  .string('identifiant structure')
  .style(styleHeaderConf);

  ws.column(2).setWidth(20);
  ws.cell(start, 2)
  .string('SIRET')
  .style(styleHeaderConf);

  ws.column(3).setWidth(50);
  ws.cell(start, 3)
  .string('Nom Structure')
  .style(styleHeaderConf);

  ws.column(4).setWidth(20);
  ws.cell(start, 4)
  .string('Nombre de CN souhaité')
  .style(styleHeaderConf);

  ws.column(5).setWidth(25);
  ws.cell(start, 5)
  .string('Avis positif')
  .style(styleHeaderConf);

  ws.column(6).setWidth(20);
  ws.cell(start, 6)
  .string('Nombre de CN attribué')
  .style(styleHeaderConf);

  ws.column(7).setWidth(70);
  ws.cell(start, 7)
  .string('Si avis négatif ou examen complémentaire : Commentaires')
  .style(styleHeaderConf);

  // Add all structures
  structures.forEach(function(s, i) {
    ws.cell(i + start + 1, 1)
    .number(s.id)
    .style(styleConf);

    ws.cell(i + start + 1, 2)
    .string(s.siret || '')
    .style(styleConf);

    ws.cell(i + start + 1, 3)
    .string(s.name)
    .style(styleConf);

    ws.cell(i + start + 1, 4)
    .number(~~s.coaches_requested)
    .style(styleConf);

    ws.addDataValidation({
      type: 'list',
      allowBlank: true,
      prompt: 'Choisissez dans la liste',
      error: 'Choix non valide',
      showDropDown: true,
      sqref: `D${i + start + 1}:D${i + start + 1}`,
      formulas: [validation],
    });

    ws.cell(i + start + 1, 5)
    .string('')
    .style(styleConf);

    ws.addDataValidation({
      type: 'list',
      allowBlank: true,
      prompt: 'Choisissez dans la liste',
      error: 'Choix non valide',
      showDropDown: true,
      sqref: `E${i + start + 1}:E${i + start + 1}`,
      formulas: ['OUI,NON,EXAMEN COMPLEMENTAIRE'],
    });

    ws.cell(i + start + 1, 6)
    .number(0)
    .style(styleConf);

    ws.addDataValidation({
      type: 'list',
      allowBlank: true,
      prompt: 'Choisissez dans la liste',
      error: 'Choix non valide',
      showDropDown: true,
      sqref: `F${i + start + 1}:F${i + start + 1}`,
      formulas: [validation],
    });

    ws.cell(i + start + 1, 7)
    .string('')
    .style(styleConf);
  });
};

const createWorkbook = (departement, structuresPubliques, structuresPrivees) => {
  const wb = new xl.Workbook({
    defaultFont: {
      size: 12,
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
    nombre: `Nombre de structures publiques candidates : ${structuresPubliques.length}`,
    liste: 'Liste A : Structures publiques',
  };

  const confPrivees = {
    titre: 'PROGRAMME SOCIETE NUMERIQUE - ANCT',
    departement: `Département ${departement} ${deps.get(String(departement)).dep_name}`,
    nombre: `Nombre de structures privées candidates : ${structuresPrivees.length}`,
    liste: 'Liste B : Structures privées',
  };

  buildWorksheet(ws1, structuresPubliques, confPubliques);
  buildWorksheet(ws2, structuresPrivees, confPrivees);

  return Promise.resolve(wb);
};

const createExcelForDep = async departement => {
  const structuresPrivees = await getStructures(departement, 'PRIVATE');
  const structuresPubliques = await getStructures(departement, 'COLLECTIVITE,COMMUNE,EPCI,DEPARTEMENT');
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
  if (program.departement) {
    await createExcelForDep(program.departement);
  } else {
    await createExcelForAllDeps();
  }
})();


