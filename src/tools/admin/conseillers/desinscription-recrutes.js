const { deleteMailbox } = require('../../../utils/mailbox');
const { deleteAccount } = require('../../../utils/mattermost');
const dayjs = require('dayjs');
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

execute(__filename, async ({ db, logger, exit, Sentry, gandi, mattermost }) => {

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
          const login = conseillerCoop?.emailCN?.address.substring(0, conseillerCoop.emailCN?.address.lastIndexOf('@'));
          if (conseillerCoop === null) {
            logger.warn(`Aucun conseiller recruté avec l'email '${email}' n'a été trouvé`);
            errors++;
            reject();
          } else if (userCoop === null) {
            logger.warn(`Aucun utilisateur recruté avec l'email '${email}' n'a été trouvé`);
            errors++;
            reject();
          } else if (login === undefined) {
            logger.warn(`Login Gandi inexistant avec l'email '${email}'`);
            errors++;
            reject();
          } else {
            //Mise à jour du statut
            await db.collection('conseillers').updateOne({ _id: conseillerCoop._id }, {
              $set: {
                statut: 'RUPTURE',
                dateRuptureContrat: conseiller['Date rupture de contrat'] ? dayjs(conseiller['Date rupture de contrat'], 'YYYY-MM-DD').toDate() : new Date()
              }
            });
            //Suppression du user associé
            await db.collection('users').deleteOne({ _id: userCoop._id });
            ok++;
            //Suppression compte Gandi
            await deleteMailbox(gandi, conseillerCoop._id, login, db, logger, Sentry);
            //Suppression compte Mattermost
            await deleteAccount(mattermost, conseillerCoop, db, logger, Sentry);
          }
          count++;
          if (total === count) {
            logger.info(`[DESINSCRIPTION COOP] Des conseillers ont été désinscrits :  ` +
                `${ok} désinscrits / ${errors} erreurs`);
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
