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

  logger.info('Désinscription des conseillers déjà recrutés');
  let promises = [];
  await new Promise(resolve => {
    readCSV(program.csv).then(async conseillers => {
      const total = conseillers.length;
      let count = 0;
      let ok = 0;
      let errors = 0;
      if (total === 0) {
        logger.info(`[DESINSCRIPTION COOP] Aucun conseiller dans le fichier fourni`);
      }
      conseillers.forEach(conseiller => {
        let p = new Promise(async (resolve, reject) => {
          const email = conseiller['email'].toLowerCase();
          const conseillerCoop = await db.collection('conseillers').findOne({ email, statut: 'RECRUTE', estRecrute: true });
          const userCoop = await db.collection('users').findOne({
            'name': conseillerCoop?.emailCN?.address,
            'roles': { $in: ['conseiller'] },
            'entity.$id': conseillerCoop?._id
          });
          if (conseillerCoop === null) {
            logger.warn(`Aucun conseiller recruté avec l'email '${email}' n'a été trouvé`);
            errors++;
            reject();
          } else if (userCoop === null) {
            logger.warn(`Aucun utilisateur recruté avec l'email '${email}' n'a été trouvé`);
            errors++;
            reject();
          } else {
            //Mise à jour du statut
            await db.collection('conseillers').updateOne({ _id: conseillerCoop._id }, {
              $set: { statut: 'RUPTURE' }
            });
            //Suppression du user associé
            await db.collection('users').deleteOne({ _id: userCoop._id });
            ok++;
          }
          count++;
          if (total === count) {
            logger.info(`[DESINSCRIPTION COOP] Des conseillers ont été désinscrits :  ` +
                `${ok} désinscrits / ${errors} erreurs`);
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
