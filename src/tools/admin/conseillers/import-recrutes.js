const CSVToJSON = require('csvtojson');
const { program } = require('commander');
const moment = require('moment');
const { v4: uuidv4 } = require('uuid');
const slugify = require('slugify');

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

execute(__filename, async ({ feathers, db, logger, exit, Sentry, app }) => {

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
          const exist = await db.collection('conseillers').countDocuments({ email });
          if (alreadyRecruted > 0) {
            logger.error(`Un conseiller avec l'email '${email}' a déjà été recruté`);
            Sentry.captureException(`Un conseiller avec l'email '${email}' a déjà été recruté`);
            errors++;
            reject();
          } else if (exist === 0) {
            logger.error(`Conseiller avec l'email '${email}' introuvable`);
            Sentry.captureException(`Conseiller avec l'email '${email}' introuvable`);
            errors++;
            reject();
          } else {
            const structureId = parseInt(conseiller['ID structure (plateforme)']);
            await db.collection('conseillers').updateOne({ email }, {
              $set: {
                statut: 'RECRUTE',
                disponible: false,
                estRecrute: true,
                datePrisePoste: moment(conseiller['Date de prise de poste / départ en formation'], 'MM/DD/YY').toDate(),
                dateFinFormation: moment(conseiller['Date de fin de formation'], 'MM/DD/YY').toDate(),
                structureId
              }
            });

            await db.collection('misesEnRelation').updateOne({ 'conseillerObj.email': email, 'structureObj.idPG': structureId }, {
              $set: {
                statut: 'finalisee',
              }
            });

            await db.collection('misesEnRelation').updateMany({ 'conseillerObj.email': email, 'structureObj.idPG': { $ne: structureId } }, {
              $set: {
                statut: 'finalisee_non_disponible',
              }
            }, { multi: true });

            const role = 'conseiller';
            const dbName = db.serverConfig.s.options.dbName;
            const conseillerDoc = await db.collection('conseillers').findOne({ email });
            const gandi = app.get('gandi');
            await feathers.service('users').create({
              name: slugify(`${conseillerDoc.prenom}.${conseillerDoc.nom}@${gandi.domain}`).toLowerCase(),
              password: uuidv4(), // random password (required to create user)
              roles: Array(role),
              entity: {
                '$ref': `${role}s`,
                '$id': conseillerDoc._id,
                '$db': dbName
              },
              token: uuidv4(),
              mailSentDate: null, // on stock la date du dernier envoi de mail de création pour le mécanisme de relance
              passwordCreated: false,
              createdAt: new Date(),
            });
            count++;
            resolve();
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
