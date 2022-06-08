const CSVToJSON = require('csvtojson');
const { program } = require('commander');
const ExcelJS = require('exceljs');
const fs = require('fs');
const path = require('path');
const { execute } = require('../utils');

program.option('-f, --file <file>', 'Excel file path');

program.parse(process.argv);

const conseillersToExcelFileHeaders = [
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
  const NOM = 1;
  const PRENOM = 2;
  const EMAIL = 3;
  const CERTIFIE = 4;

  const workbookReader = new ExcelJS.stream.xlsx.WorkbookReader(file);
  const listConseiller = [];
  for await (const worksheetReader of workbookReader) {
    let i = 0;
    for await (const row of worksheetReader) {
      if (++i < start) {
        continue;
      }
      const nom = row.getCell(NOM).value;
      const prenom = row.getCell(PRENOM).value;
      const email = row.getCell(EMAIL).value;
      const certifie = row.getCell(CERTIFIE).value;
      listConseiller.push({
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
    const pathCsvFile = writeConseillersToExcelInCSVFile(conseillers);
    readCSV(pathCsvFile).then(async conseillers => {
      conseillers.forEach(conseiller => {
        promises.push(new Promise(async resolve => {
          const existConseillerWithStatut = await db.collection('conseillers').findOne({ 'email': conseiller.email, 'statut': 'RECRUTE' });
          if (existConseillerWithStatut !== null) {
            await db.collection('conseillers').updateOne({ email: conseiller.email, certifie: { $exists: false } }, { $set: { certifie: true } });
            resolve();
          }
        }));
      });
    });
  });
  await Promise.all(promises);
  logger.info('mis à jour de la certification des conseillers');
});
