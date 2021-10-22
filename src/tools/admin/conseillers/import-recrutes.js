const CSVToJSON = require('csvtojson');
const { program } = require('commander');
const dayjs = require('dayjs');
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
          const regexDateFormation = new RegExp(/^([0-2][0-9]|(3)[0-1])(\/)(((0)[0-9])|((1)[0-2]))(\/)((202)[0-9])$/);
          const email = conseiller['Mail CNFS'].toLowerCase();
          const idPGConseiller = parseInt(conseiller['ID conseiller']);
          const alreadyRecruted = await db.collection('conseillers').countDocuments({ idPG: idPGConseiller, estRecrute: true });
          const exist = await db.collection('conseillers').countDocuments({ idPG: idPGConseiller });
          const structureId = parseInt(conseiller['ID structure']);
          const structure = await db.collection('structures').findOne({ idPG: structureId });
          const miseEnRelation = await db.collection('misesEnRelation').findOne({
            'conseillerObj.idPG': idPGConseiller,
            'structureObj.idPG': structureId,
            'statut': 'recrutee'
          });
          if (alreadyRecruted > 0) {
            logger.warn(`Un conseiller avec l'id: ${idPGConseiller} a déjà été recruté`);
            errors++;
            reject();
          } else if (exist === 0) {
            logger.error(`Conseiller avec l'id: ${idPGConseiller} introuvable`);
            Sentry.captureException(`Conseiller avec l'id: ${idPGConseiller} introuvable`);
            errors++;
            reject();
          } else if (structure === null) {
            logger.error(`Structure avec l'idPG '${structureId}' introuvable`);
            Sentry.captureException(`Structure avec l'idPG '${structureId}' introuvable`);
            errors++;
            reject();
          } else if (miseEnRelation === null) {
            logger.error(`Mise en relation introuvable pour la structure avec l'idPG '${structureId}'`);
            Sentry.captureException(`Mise en relation introuvable pour la structure avec l'idPG '${structureId}'`);
            errors++;
            reject();
          // eslint-disable-next-line max-len
          } else if ((conseiller['Date de fin de formation'] !== '#N/D' && !regexDateFormation.test(conseiller['Date de fin de formation'])) || !regexDateFormation.test(conseiller['Date de départ en formation'])) {
            // eslint-disable-next-line max-len
            logger.error(`Format date invalide : attendu DD/MM/YYYY pour les dates de formation dans le fichier csv pour le conseiller avec l'id: ${idPGConseiller}`);
            errors++;
            reject();
          } else {
            // eslint-disable-next-line max-len
            const dateFinFormation = conseiller['Date de fin de formation'] !== '#N/D' ? conseiller['Date de fin de formation'].replace(/^(.{2})(.{1})(.{2})(.{1})(.{4})$/, '$5-$3-$1') : null;
            const datePrisePoste = conseiller['Date de départ en formation'].replace(/^(.{2})(.{1})(.{2})(.{1})(.{4})$/, '$5-$3-$1');
            // eslint-disable-next-line max-len
            await db.collection('misesEnRelation').updateOne({ 'conseillerObj.idPG': idPGConseiller, 'structureObj.idPG': structureId, 'statut': 'recrutee' }, {
              $set: {
                statut: 'finalisee',
              }
            });

            // eslint-disable-next-line max-len
            await db.collection('misesEnRelation').updateMany({ 'conseillerObj.idPG': idPGConseiller, 'statut': { $ne: 'finalisee' } }, {
              $set: {
                statut: 'finalisee_non_disponible',
              }
            }, { multi: true });

            const role = 'conseiller';
            const dbName = db.serverConfig.s.options.dbName;
            const conseillerDoc = await db.collection('conseillers').findOne({ _id: miseEnRelation.conseillerObj._id });
            if (!conseillerDoc.userCreated) {
              await feathers.service('users').create({
                name: email,
                prenom: conseillerDoc.prenom,
                nom: conseillerDoc.nom,
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
            } else {
              await db.collection('users').updateOne({ name: email }, {
                $set: {
                  roles: Array(role),
                  token: uuidv4(),
                  mailSentDate: null,
                  passwordCreated: false,
                }
              });
            }
            await db.collection('conseillers').updateOne({ _id: miseEnRelation.conseillerObj._id }, { $set: {
              statut: 'RECRUTE',
              disponible: false,
              estRecrute: true,
              datePrisePoste: dayjs(datePrisePoste, 'YYYY-MM-DD').toDate(),
              dateFinFormation: dateFinFormation !== null ? dayjs(dateFinFormation, 'YYYY-MM-DD').toDate() : null,
              structureId: structure._id,
              userCreated: true
            } });
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
