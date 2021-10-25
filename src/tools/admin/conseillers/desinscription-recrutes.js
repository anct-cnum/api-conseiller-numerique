const { deleteMailbox } = require('../../../utils/mailbox');
const { deleteAccount } = require('../../../utils/mattermost');
const dayjs = require('dayjs');
const CSVToJSON = require('csvtojson');
const { program } = require('commander');
const createMailer = require('../../../mailer');
const createEmails = require('../../../emails/emails');

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
const sendEmail = async (app, db, conseillerFinalisee) => {
  const structure = await db.collection('structures').findOne({ _id: conseillerFinalisee.structureObj._id });
  let emailContactStructure = structure.contact.email;
  let mailer = createMailer(app, emailContactStructure, conseillerFinalisee);
  const emails = createEmails(db, mailer);
  let message = emails.getEmailMessageByTemplateName('conseillerRuptureStructure');
  return await message.send(conseillerFinalisee, emailContactStructure);
};
const { execute } = require('../../utils');

execute(__filename, async ({ db, logger, exit, Sentry, gandi, mattermost, app }) => {

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
          const conseillerFinalisee = await db.collection('misesEnRelation').findOne(
            { 'statut': 'finalisee',
              'conseiller.$id': conseillerCoop._id
            });
          const conseillerInfos = await db.collection('conseillers').findOne({ _id: conseillerFinalisee.conseillerObj._id });
          const userCoop = await db.collection('users').findOne({
            'roles': { $in: ['conseiller'] },
            'entity.$id': conseillerCoop?._id
          });
          const login = conseillerCoop?.emailCN?.address?.substring(0, conseillerCoop.emailCN?.address?.lastIndexOf('@'));
          if (conseillerCoop === null) {
            logger.warn(`Aucun conseiller recruté avec l'email '${email}' n'a été trouvé`);
            errors++;
            reject();
          } else if (conseillerCoop.structureId === undefined) {
            logger.warn(`Aucune structure associé au conseiller recruté avec l'email '${email}'`);
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
            //Mise à jour de la mise en relation
            await db.collection('misesEnRelation').updateOne(
              { 'conseiller.$id': conseillerCoop._id,
                'structure.$id': conseillerCoop.structureId,
                'statut': 'finalisee'
              },
              {
                $set: {
                  statut: 'finalisee_rupture',
                }
              }
            );
            //Suppression du user associé
            if (userCoop !== null) {
              await db.collection('users').deleteOne({ _id: userCoop._id });
            }
            //Suppression compte Gandi
            if (login !== undefined) {
              await deleteMailbox(gandi, conseillerCoop._id, login, db, logger, Sentry);
            }
            //Suppression compte Mattermost
            if (conseillerCoop.mattermost?.id !== undefined) {
              await deleteAccount(mattermost, conseillerCoop, db, logger, Sentry);
            }
            ok++;
          }
          count++;
          // TODO appel de la fonction pour l'envoi du mail
          // try {
          //   await sendEmail(app, db, conseillerFinalisee);
          // } catch (error) {
          //   console.log('error:', error);
          //   logger.error(error.message);
          //   Sentry.captureException(error);
          //   return;
          // }
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
