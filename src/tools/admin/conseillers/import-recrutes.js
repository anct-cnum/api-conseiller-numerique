const CSVToJSON = require('csvtojson');
const { program } = require('commander');
const moment = require('moment');
const { v4: uuidv4 } = require('uuid');

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

execute(__filename, async ({ feathers, db, logger, exit, Sentry }) => {

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

            const structureId = conseiller['ID structure (plateforme)'];

            const result = await db.collection('conseillers').updateOne({ email }, {
              $set: {
                statut: 'RECRUTE',
                disponible: false,
                estRecrute: true,
                datePrisePoste: moment(conseiller['Date de prise de poste / départ en formation'], 'DD/MM/YYYY'),
                dateFinFormation: moment(conseiller['Date de fin de formation'], 'DD/MM/YYYY'),
                structureId
              }
            });

            await db.collection('miseEnRelation').updateOne({ 'conseillerObj.email': email, 'structureObj.idPG': structureId }, {
              $set: {
                statut: 'finalisee',
              }
            });

            await db.collection('miseEnRelation').updateOne({ 'conseillerObj.email': email, 'structureObj.idPG': { $ne: structureId } }, {
              $set: {
                statut: 'finalisee_non_disponible',
              }
            });

            const role = 'conseiller';
            const dbName = db.serverConfig.s.options.dbName;
            const conseillerDoc = await db.collection('conseillers').findOne({ email });
            await feathers.service('users').create({
              name: email,
              password: null,
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
