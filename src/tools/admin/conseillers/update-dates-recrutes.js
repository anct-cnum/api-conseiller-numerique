const dayjs = require('dayjs');
const CSVToJSON = require('csvtojson');
const { program } = require('commander');

program
.option('-c, --csv <path>', 'CSV file path');

program.parse(process.argv);

const readCSV = async filePath => {
  try {
    // eslint-disable-next-line new-cap
    const users = await CSVToJSON({ delimiter: 'auto' }).fromFile(filePath);
    return users;
  } catch (err) {
    throw err;
  }
};

const { execute } = require('../../utils');

execute(__filename, async ({ db, logger, exit, Sentry }) => {

  logger.info('[CONSEILLERS COOP] Remise à niveau des dates de prise de poste et de fin de formation');
  let promises = [];
  await new Promise(resolve => {
    readCSV(program.csv).then(async conseillers => {
      const total = conseillers.length;
      let count = 0;
      let ok = 0;
      let errors = 0;
      if (total === 0) {
        logger.info(`[CONSEILLERS COOP] Aucun conseiller présent dans le fichier fourni`);
      }
      conseillers.forEach(conseiller => {
        let p = new Promise(async (resolve, reject) => {
          const email = conseiller['Mail CNFS'].toLowerCase();
          //Dates dans le fichier au format DD/MM/YYYY
          const dateFinFormation = conseiller['Date de fin de formation'].replace(/^(.{2})(.{1})(.{2})(.{1})(.{4})$/, '$5-$3-$1');
          const datePrisePoste = conseiller['Date de départ en formation'].replace(/^(.{2})(.{1})(.{2})(.{1})(.{4})$/, '$5-$3-$1');
          const conseillerCoop = await db.collection('conseillers').findOne({ email, statut: 'RECRUTE', estRecrute: true });
          if (conseillerCoop === null) {
            logger.warn(`Aucun conseiller recruté avec l'email '${email}' n'a été trouvé`);
            errors++;
            reject();
          } else {
            //Mise à jour du conseiller
            await db.collection('conseillers').updateOne({ _id: conseillerCoop._id }, {
              $set: {
                datePrisePoste: dayjs(datePrisePoste, 'YYYY-MM-DD').toDate(),
                dateFinFormation: dayjs(dateFinFormation, 'YYYY-MM-DD').toDate()

              }
            });
            //Mise à jour des mises en relation associées
            await db.collection('misesEnRelation').updateMany(
              { 'conseiller.$id': conseillerCoop._id },
              {
                $set: {
                  'conseillerObj.datePrisePoste': dayjs(datePrisePoste, 'YYYY-MM-DD').toDate(),
                  'conseillerObj.dateFinFormation': dayjs(dateFinFormation, 'YYYY-MM-DD').toDate()
                }
              }
            );
            ok++;
          }
          count++;
          if (total === count) {
            logger.info(`[CONSEILLERS COOP] Des conseillers ont été mis à jour :  ` +
                `${ok} mis à jour / ${errors} erreurs`);
            exit();
          }
        });
        promises.push(p);
      });
      resolve();
    }).catch(error => {
      logger.error(error.message);
      Sentry.captureException(error);
    });
  });
  await Promise.allSettled(promises);
  exit();
});
