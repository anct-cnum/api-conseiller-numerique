const CSVToJSON = require('csvtojson');
const { program } = require('commander');
const dayjs = require('dayjs');

const readCSV = async filePath => {
  try {
    const users = await CSVToJSON({ delimiter: ';' }).fromFile(filePath);
    return users;
  } catch (err) {
    throw err;
  }
};

const { execute } = require('../utils');

execute(__filename, async ({ db, logger, exit }) => {
  program.option('-c, --csv <path>', 'CSV file path');
  program.helpOption('-e', 'HELP command');
  program.parse(process.argv);

  const arrayIdCNRupture = await db.collection('conseillersRuptures').distinct('conseillerId');
  const date = date => dayjs(date, 'YYYY-MM-DD').toDate();
  let countConseiller = 0;
  let countConseillerSupprime = 0;

  const arrayIdPGConseiller = await db.collection('conseillers').find({
    _id: { '$in': arrayIdCNRupture },
    dateFinFormation: { '$exists': false }
  }).toArray();
  const ListConseillerIdPG = arrayIdPGConseiller.map(e => e.idPG);

  const arrayIdPGSupprime = await db.collection('conseillersSupprimes').find({
    'conseiller._id': { '$in': arrayIdCNRupture },
    'conseiller.dateFinFormation': { '$exists': false }
  }).toArray();
  const ListConseilleSupprimeIdPG = arrayIdPGSupprime.map(e => e.conseiller.idPG);

  await new Promise(() => {
    readCSV(program.csv).then(async fichier => {
      await new Promise(async () => {
        for (const coop of fichier) {
          const emailCN = coop['Mail CNFS'];
          const datePrisePoste = coop['Date de départ en formation'].replace(/^(.{2})(.{1})(.{2})(.{1})(.{4})$/, '$5-$3-$1');
          const dateFinFormation = coop['Date de fin de formation'].replace(/^(.{2})(.{1})(.{2})(.{1})(.{4})$/, '$5-$3-$1');
          const idStructure = coop['ID structure'];
          const idConseiller = parseInt(coop['ID conseiller']);
          if (ListConseillerIdPG.includes(idConseiller)) {
            await db.collection('conseillers').updateOne({ idPG: idConseiller },
              { $set: {
                datePrisePoste: date(datePrisePoste),
                dateFinFormation: date(dateFinFormation),
              } });
            logger.info(['- ' + emailCN, datePrisePoste, dateFinFormation, idStructure, idConseiller].join(','));
            countConseiller++;
          }
          if (ListConseilleSupprimeIdPG.includes(idConseiller)) {
            await db.collection('conseillersSupprimes').updateOne({ 'conseiller.idPG': idConseiller },
              { $set: {
                'conseiller.datePrisePoste': date(datePrisePoste),
                'conseiller.dateFinFormation': date(dateFinFormation),
              } });
            logger.info(['* ' + emailCN, datePrisePoste, dateFinFormation, idStructure, idConseiller].join(','));
            countConseillerSupprime++;
          }
        }
        logger.info(`${countConseiller} / ${ListConseillerIdPG.length} pour la collection conseillers`);
        logger.info(`${countConseillerSupprime} / ${arrayIdPGSupprime.length} pour la collection conseillersSupprimes`);
        exit();
      });
    }).catch(error => {
      logger.error(error);
    });
  });
});
