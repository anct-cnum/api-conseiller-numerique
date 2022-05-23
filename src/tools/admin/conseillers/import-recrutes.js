const CSVToJSON = require('csvtojson');
const { program } = require('commander');
const dayjs = require('dayjs');
const { v4: uuidv4 } = require('uuid');
const { Pool } = require('pg');
const pool = new Pool();
const { createMailbox } = require('../../../utils/mailbox');
const slugify = require('slugify');

const configPG = {
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
  db: process.env.PGDATABASE,
  port: process.env.PGPORT,
  sslMode: process.env.PGSSLMODE,
  host: process.env.PGHOST
};

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

execute(__filename, async ({ feathers, app, db, logger, exit, Sentry }) => {

  if (Object.values(configPG).includes(undefined)) {
    logger.warn(`ATTENTION : les 6 vars d'env PG n'ont pas été configurées`);
    return exit();
  }

  logger.info('Import des conseillers recrutés');
  let count = 0;
  let errors = 0;

  const updateConseillersPG = async (email, disponible) => {
    try {
      await pool.query(`
        UPDATE djapp_coach
        SET disponible = $2
        WHERE LOWER(email) = LOWER($1)`,
      [email, disponible]);
    } catch (error) {
      logger.error(error);
      Sentry.captureException(error.message);
    }
  };

  const sleep = ms => new Promise(r => setTimeout(r, ms));

  await new Promise(() => {
    readCSV(program.csv).then(async conseillers => {
      await new Promise(async () => {
        for (const conseiller of conseillers) {
          const regexDateFormation = new RegExp(/^([0-2][0-9]|(3)[0-1])(\/)(((0)[0-9])|((1)[0-2]))(\/)((202)[0-9])$/);
          const idPGConseiller = parseInt(conseiller['ID conseiller']);
          const alreadyRecruted = await db.collection('conseillers').countDocuments({ idPG: idPGConseiller, estRecrute: true });
          const conseillerOriginal = await db.collection('conseillers').findOne({ idPG: idPGConseiller });
          const structureId = parseInt(conseiller['ID structure']);
          const structure = await db.collection('structures').findOne({ idPG: structureId });
          const miseEnRelation = await db.collection('misesEnRelation').findOne({
            'conseillerObj.idPG': idPGConseiller,
            'structureObj.idPG': structureId,
            'statut': 'recrutee'
          });
          const dateFinFormation = conseiller['Date de fin de formation'].replace(/^(.{2})(.{1})(.{2})(.{1})(.{4})$/, '$5-$3-$1');
          const datePrisePoste = conseiller['Date de départ en formation'].replace(/^(.{2})(.{1})(.{2})(.{1})(.{4})$/, '$5-$3-$1');
          const formatDate = date => dayjs(date).format('DD/MM/YYYY');
          const date = date => dayjs(date, 'YYYY-MM-DD').toDate();

          if (!regexDateFormation.test(conseiller['Date de fin de formation']) || !regexDateFormation.test(conseiller['Date de départ en formation'])) {
            logger.error(`Format date invalide (attendu DD/MM/YYYY) pour les dates de formation pour le conseiller avec l'id: ${idPGConseiller}`);
            errors++;
          } else if (alreadyRecruted > 0) {
            logger.warn(`Un conseiller avec l'id: ${idPGConseiller} a déjà été recruté`);
            errors++;
            // eslint-disable-next-line max-len
            if (((formatDate(conseillerOriginal.dateFinFormation) !== formatDate(dateFinFormation)) || (formatDate(conseillerOriginal.datePrisePoste) !== formatDate(datePrisePoste)))) {
              // eslint-disable-next-line max-len
              const loggerDateFinFormation = `La date fin formation indiquée dans le fichier:${formatDate(dateFinFormation)} n'est pas identique que celui en base:${formatDate(conseillerOriginal.dateFinFormation)}`;
              // eslint-disable-next-line max-len
              const loggerDatePrisePoste = `La date Prise de poste indiquée dans le fichier:${formatDate(datePrisePoste)} n'est pas identique que celui en base:${formatDate(conseillerOriginal.datePrisePoste)}`;
              const loggerDateFin = `${formatDate(conseillerOriginal.dateFinFormation) !== formatDate(dateFinFormation) ? loggerDateFinFormation : ''}`;
              const loggerDateDebut = `${formatDate(conseillerOriginal.datePrisePoste) !== formatDate(datePrisePoste) ? loggerDatePrisePoste : ''}`;
              if (loggerDateFin !== '') {
                logger.info(`${loggerDateFin} pour le conseiller avec l'id: ${idPGConseiller}`);
              }
              if (loggerDateDebut !== '') {
                logger.info(`${loggerDateDebut} pour le conseiller avec l'id: ${idPGConseiller}`);
              }
              await db.collection('conseillers').updateOne({ _id: conseillerOriginal._id }, {
                $set: {
                  datePrisePoste: date(datePrisePoste),
                  dateFinFormation: date(dateFinFormation)
                } });
              await db.collection('misesEnRelation').updateMany({ 'conseiller.$id': conseillerOriginal._id }, {
                $set: {
                  'conseillerObj.datePrisePoste': date(datePrisePoste),
                  'conseillerObj.dateFinFormation': date(dateFinFormation)
                } });
            }
          } else if (conseillerOriginal === null) {
            logger.error(`Conseiller avec l'id: ${idPGConseiller} introuvable`);
            Sentry.captureException(`Conseiller avec l'id: ${idPGConseiller} introuvable`);
            errors++;
          } else if (structure === null) {
            logger.error(`Structure avec l'idPG '${structureId}' introuvable`);
            Sentry.captureException(`Structure avec l'idPG '${structureId}' introuvable`);
            errors++;
          } else if (structure.contact.email === conseillerOriginal.email) {
            logger.error(`Email identique entre le conseiller ${idPGConseiller} et la structure '${structureId}'`);
            Sentry.captureException(`Email identique entre le conseiller ${idPGConseiller} et la structure '${structureId}'`);
            errors++;
          } else if (miseEnRelation === null) {
            logger.error(`Mise en relation introuvable pour la structure avec l'idPG '${structureId}'`);
            Sentry.captureException(`Mise en relation introuvable pour la structure avec l'idPG '${structureId}'`);
            errors++;
          } else {
            //Maj PG en premier lieu pour éviter la resynchro PG > Mongo (avec email pour tous les doublons potentiels)
            await updateConseillersPG(conseillerOriginal.email, false);

            const role = 'conseiller';
            const dbName = db.serverConfig.s.options.dbName;
            const userAccount = await db.collection('users').findOne({ name: conseillerOriginal.email, roles: { $in: ['candidat'] } });
            if (userAccount === null) {
              await feathers.service('users').create({
                name: conseillerOriginal.email,
                prenom: conseillerOriginal.prenom,
                nom: conseillerOriginal.nom,
                password: uuidv4(), // random password (required to create user)
                roles: Array(role),
                entity: {
                  '$ref': `${role}s`,
                  '$id': conseillerOriginal._id,
                  '$db': dbName
                },
                token: uuidv4(),
                mailSentDate: null, // on stock la date du dernier envoi de mail de création pour le mécanisme de relance
                passwordCreated: false,
                createdAt: new Date(),
              });
            } else {
              await db.collection('users').updateOne({ name: conseillerOriginal.email }, {
                $set: {
                  prenom: conseillerOriginal.prenom, //nécessaire si compte candidat pas sur le même doublon avec renseignements différents
                  nom: conseillerOriginal.nom,
                  roles: Array(role),
                  token: uuidv4(),
                  mailSentDate: null,
                  passwordCreated: false,
                  entity: {
                    '$ref': `${role}s`,
                    '$id': conseillerOriginal._id, //nécessaire si compte candidat pas sur le même doublon
                    '$db': dbName
                  }
                }
              });
            }
            await db.collection('conseillers').updateOne({ _id: conseillerOriginal._id }, { $set: {
              statut: 'RECRUTE',
              disponible: false,
              estRecrute: true,
              datePrisePoste: date(datePrisePoste),
              dateFinFormation: date(dateFinFormation),
              structureId: structure._id,
              userCreated: true
            }, $unset: {
              userCreationError: ''
            } });
            const conseillerUpdated = await db.collection('conseillers').findOne({ _id: conseillerOriginal._id });

            await db.collection('misesEnRelation').updateOne({ 'conseillerObj.idPG': idPGConseiller, 'structureObj.idPG': structureId, 'statut': 'recrutee' }, {
              $set: {
                statut: 'finalisee',
                conseillerObj: conseillerUpdated
              }
            });

            await db.collection('misesEnRelation').updateMany({
              'conseillerObj.idPG': idPGConseiller,
              'statut': { $nin: ['finalisee', 'finalisee_rupture'] }
            }, {
              $set: {
                statut: 'finalisee_non_disponible',
                conseillerObj: conseillerUpdated
              }
            });

            //Mise à jour des doublons
            await db.collection('conseillers').updateMany({ _id: { $ne: conseillerOriginal._id }, email: conseillerOriginal.email }, { $set: {
              disponible: false,
              userCreated: false //si compte candidat n'était pas sur le même doublon
            } });

            await db.collection('misesEnRelation').updateMany({
              'conseillerObj.idPG': { $ne: idPGConseiller },
              'conseillerObj.email': conseillerOriginal.email,
              'statut': { $ne: 'finalisee_rupture' }
            }, {
              $set: {
                'statut': 'finalisee_non_disponible',
                'conseillerObj.disponible': false,
                'conseillerObj.userCreated': false
              }
            });

            // Creation boite mail du conseiller
            const gandi = app.get('gandi');
            const nom = slugify(`${conseillerUpdated.nom}`, { replacement: '-', lower: true, strict: true });
            const prenom = slugify(`${conseillerUpdated.prenom}`, { replacement: '-', lower: true, strict: true });
            const login = `${prenom}.${nom}`;
            const password = uuidv4() + 'AZEdsf;+:'; // Sera choisi par le conseiller via invitation
            await createMailbox({ gandi, db, logger, Sentry: Sentry })({ conseillerId: conseillerUpdated._id, login, password });
            await sleep(1000);

            count++;
          }
        }
        if (count + errors === conseillers.length) {
          logger.info(`${count} conseillers recrutés et ${errors} conseillers en erreur`);
          exit();
        }
      });
    }).catch(error => {
      logger.error(error);
    });
  });
});
