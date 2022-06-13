const CSVToJSON = require('csvtojson');
const { program } = require('commander');
const ExcelJS = require('exceljs');
const fs = require('fs');
const path = require('path');
const { execute } = require('../utils');
const { exit } = require('process');

program.option('-f, --file <file>', 'Excel file path');

program.parse(process.argv);

const conseillersToExcelFileHeaders = [
  'idPG',
  'nom',
  'prenom',
  'email',
  'certifie'
];

const writeConseillersToExcelInCSVFile = conseillersToExcel => {
  const csvFile = path.join(__dirname, '../../../../data/exports', 'conseillers-to-xls.csv');
  const file = fs.createWriteStream(csvFile, { flags: 'w' });

  file.write(`${conseillersToExcelFileHeaders.join(';')}\n`);

  conseillersToExcel.forEach(conseillerToExcel => {
    const fileLine = [
      conseillerToExcel.idPG,
      conseillerToExcel.nom,
      conseillerToExcel.prenom,
      conseillerToExcel.email,
      conseillerToExcel.certifie
    ];

    file.write(`${fileLine.join(';')}\n`);
  });

  file.close();
  return csvFile;
};

const readCSV = async filePath => {
  try {
    // eslint-disable-next-line new-cap
    const conseillersList = await CSVToJSON({ delimiter: 'auto' }).fromFile(filePath);
    return conseillersList;
  } catch (err) {
    throw err;
  }
};

const readExcel = async file => {
  const start = 2;
  // Colonnes Excel
  const IDPG = 1;
  const NOM = 2;
  const PRENOM = 3;
  const EMAIL = 4;
  const CERTIFIE = 5;

  const workbookReader = new ExcelJS.stream.xlsx.WorkbookReader(file);
  const listConseiller = [];
  for await (const worksheetReader of workbookReader) {
    if (!worksheetReader.name.includes('CCP1 REMN')) {
      continue;
    }
    let i = 0;
    for await (const row of worksheetReader) {
      if (++i < start) {
        continue;
      }
      const idPG = row.getCell(IDPG).value;
      const nom = row.getCell(NOM).value;
      const prenom = row.getCell(PRENOM).value;
      const email = row.getCell(EMAIL).value;
      const certifie = row.getCell(CERTIFIE).value;
      listConseiller.push({
        'idPG': idPG,
        'nom': nom,
        'prenom': prenom,
        'email': email,
        'certifie': certifie
      });
    }
  }

  return listConseiller;
};

execute(__filename, async ({ logger, db }) => {
  let promises = [];
  readExcel(program.file).then(async conseillers => {
    if (!conseillers.length) {
      logger.info('le fichier ne correspond pas au fichier attendu');
      exit();
    }
    const pathCsvFile = writeConseillersToExcelInCSVFile(conseillers);
    readCSV(pathCsvFile).then(async conseillers => {
      conseillers.forEach(conseiller => {
        promises.push(new Promise(async resolve => {
          const existConseillerWithStatut = await db.collection('conseillers').findOne({
            'idPG': parseInt(conseiller.idPG),
            'statut': 'RECRUTE',
            'certifie': { $exists: false }
          });
          if (existConseillerWithStatut !== null) {
            await db.collection('conseillers').updateOne({ idPG: parseInt(conseiller.idPG) }, { $set: { certifie: true } });
            resolve();
          }
        }));
      });
    });
    await Promise.all(promises);
    logger.info('mis à jour de la certification des conseillers');
  });
});
