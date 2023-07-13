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
  'prenom',
  'nom',
  'email',
  'certifie'
];

const writeConseillersToExcelInCSVFile = conseillersToExcel => {
  const csvFile = path.join(__dirname, '../../../data/exports', 'conseillers-to-xls.csv');
  const file = fs.createWriteStream(csvFile, { flags: 'w' });

  file.write(`${conseillersToExcelFileHeaders.join(';')}\n`);

  conseillersToExcel.forEach(conseillerToExcel => {
    const fileLine = [
      conseillerToExcel.idPG,
      conseillerToExcel.prenom,
      conseillerToExcel.nom,
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
  const PRENOM = 1;
  const NOM = 2;
  const EMAIL = 3;
  const IDPG = 4;
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
      const prenom = row.getCell(PRENOM).value;
      const nom = row.getCell(NOM).value;
      const email = row.getCell(EMAIL).value;
      const certifie = row.getCell(CERTIFIE).value;
      listConseiller.push({
        'idPG': idPG,
        'prenom': prenom,
        'nom': nom,
        'email': email,
        'certifie': certifie
      });
    }
  }

  return listConseiller;
};

execute(__filename, async ({ logger, db }) => {
  let promises = [];
  let totalConseillersExecution = 0;
  await new Promise(() => {
    readExcel(program.file).then(async conseillers => {
      if (!conseillers.length) {
        logger.info('le fichier ne correspond pas au fichier attendu');
        exit();
      }
      const pathCsvFile = writeConseillersToExcelInCSVFile(conseillers);
      const nbCertifieAndNonCertifie = [0, 0];
      await new Promise(() => {
        readCSV(pathCsvFile).then(async conseillers => {
          conseillers.forEach(conseiller => {
            let promise = new Promise(async () => {
              const existConseillerWithStatut = await db.collection('conseillers').findOne({
                'idPG': parseInt(conseiller.idPG),
                'statut': { $in: ['RECRUTE', 'RUPTURE'] }
              });
              if (existConseillerWithStatut !== null && conseiller.certifie === 'oui') {
                nbCertifieAndNonCertifie[0] += 1;
                await db.collection('conseillers').updateOne({ idPG: parseInt(conseiller.idPG) }, { $set: { certifie: true } });
              } else if (existConseillerWithStatut !== null && conseiller.certifie === 'non') {
                nbCertifieAndNonCertifie[1] += 1;
                await db.collection('conseillers').updateOne({ idPG: parseInt(conseiller.idPG) }, { $unset: { certifie: '' } });
              } else {
                logger.warn(conseiller.idPG);
              }
              totalConseillersExecution++;
              if (totalConseillersExecution === conseillers.length) {
                logger.info('conseillers certifié: ' + nbCertifieAndNonCertifie[0]);
                logger.info('conseillers non certifié: ' + nbCertifieAndNonCertifie[1]);
                logger.info('mis à jour de la certification des conseillers');
                exit();
              }
            });
            promises.push(promise);
          });
        });
      });
    });
  });
  await Promise.all(promises);
});
