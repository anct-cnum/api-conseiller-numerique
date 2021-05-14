const CSVToJSON = require('csvtojson');
const { program } = require('commander');

program
.option('-c, --csv <path>', 'CSV file path');

program.parse(process.argv);

const readCSV = async filePath => {
  try {
    // eslint-disable-next-line new-cap
    const users = await CSVToJSON({ delimiter: ';' }).fromFile(filePath);
    return users;
  } catch (err) {
    throw err;
  }
};

const { execute } = require('../../utils');

execute(__filename, async ({ db, logger, exit, Sentry }) => {

  logger.info('Import des conseillers recrutés');
  let count = 0;
  let errors = 0;
  let promises = [];
  await new Promise(resolve => {
    readCSV(program.csv).then(async conseillers => {
      conseillers.forEach(conseiller => {
        let p = new Promise(async (resolve, reject) => {
          const email = conseiller['Mail CNFS'].toLowerCase();
          const alreadyRecruted = await db.collection('conseillers').countDocuments({ email, estRecrute: true });
          if (alreadyRecruted > 0) {
            Sentry.captureException(`Un conseiller avec l'email '${email}' a déjà été recruté`);
            errors++;
            reject();
          } else {
            const result = await db.collection('conseillers').updateOne({ email }, {
              $set: {
                statut: 'RECRUTE',
                disponible: false,
                estRecrute: true,
                recrutedAt: new Date()
                // à voir pour les statuts: estEnEmploi, estEnFormation, estDemandeurEmploi...
              }
            });

            if (result.matchedCount === 1) {
              count++;
              resolve();
            } else {
              Sentry.captureException(`Conseiller avec l'email '${email}' introuvable`);
              errors++;
              reject();
            }
          }
        });
        promises.push(p);
      });
      resolve();
    }).catch(error => {
      logger.error(error.message);
    });
  });
  await Promise.allSettled(promises);
  logger.info(`${count} conseillers recrutés et ${errors} conseillers en erreur`);
  exit();
});
