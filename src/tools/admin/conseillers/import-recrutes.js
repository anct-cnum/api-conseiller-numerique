const CSVToJSON = require('csvtojson');
const { program } = require('commander');
const dayjs = require('dayjs');
const { v4: uuidv4 } = require('uuid');
const { createMailbox, fixHomonymesCreateMailbox } = require('../../../utils/mailbox');
const slugify = require('slugify');
const { DBRef } = require('mongodb');
const bcrypt = require('bcryptjs');
const utils = require('../../../utils/index');

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

  const sleep = ms => new Promise(r => setTimeout(r, ms));

  await new Promise(() => {
    readCSV(program.csv).then(async conseillers => {
      await new Promise(async () => {
        for (const conseiller of conseillers) {
          const regexDateFormation = new RegExp(/^([0-2][0-9]|(3)[0-1])(\/)(((0)[0-9])|((1)[0-2]))(\/)((202)[0-9])$/);
          const idPGConseiller = parseInt(conseiller['ID conseiller']);
          const alreadyRecruted = await db.collection('conseillers').countDocuments({ idPG: idPGConseiller, estRecrute: true });
          const conseillerOriginal = await db.collection('conseillers').findOne({ idPG: idPGConseiller });
          const conseillerDoublon = await db.collection('conseillers').findOne({ idPG: { '$ne': idPGConseiller }, email: conseillerOriginal?.email, statut: { '$exists': true } });
          const structureId = parseInt(conseiller['ID structure']);
          const structure = await db.collection('structures').findOne({ idPG: structureId });
          const commentaire = conseiller['Commentaires'];
          const miseEnRelation = await db.collection('misesEnRelation').findOne({
            'conseillerObj.idPG': idPGConseiller,
            'structureObj.idPG': structureId,
            'statut': 'recrutee'
          });
          const dateFinFormation = conseiller['Date de fin de formation'].replace(/^(.{2})(.{1})(.{2})(.{1})(.{4})$/, '$5-$3-$1');
          const datePrisePoste = conseiller['Date de départ en formation'].replace(/^(.{2})(.{1})(.{2})(.{1})(.{4})$/, '$5-$3-$1');
          const formatDate = date => dayjs(date).format('DD/MM/YYYY');
          const date = date => dayjs(date, 'YYYY-MM-DD').toDate();
          const dateRupture = conseillerOriginal?.ruptures?.slice(-1)[0]?.dateRupture;
          const query = conseillerOriginal?.ruptures ? { '$gt': dateRupture } : { '$gte': miseEnRelation?.dateRecrutement };
          const matchCras = { 'conseiller.$id': conseillerOriginal?._id, 'cra.dateAccompagnement': query };
          const countCras = await db.collection('cras').countDocuments(matchCras);
          const connection = app.get('mongodb');
          const database = connection.substr(connection.lastIndexOf('/') + 1);
          const dernierCoselec = structure ? utils.getCoselec(structure) : null;
          const countMiseEnrelation = await db.collection('misesEnRelation').countDocuments({
            'structure.$id': structure?._id,
            'statut': { $in: ['recrutee', 'finalisee'] },
          });

          if (conseillerOriginal === null) {
            logger.error(`Conseiller avec l'id: ${idPGConseiller} introuvable`);
            Sentry.captureException(`Conseiller avec l'id: ${idPGConseiller} introuvable`);
            errors++;
          } else if (structure === null) {
            logger.error(`Structure avec l'idPG '${structureId}' introuvable`);
            Sentry.captureException(`Structure avec l'idPG '${structureId}' introuvable`);
            errors++;
          } else if (!regexDateFormation.test(conseiller['Date de fin de formation']) || !regexDateFormation.test(conseiller['Date de départ en formation'])) {
            logger.error(`Format date invalide (attendu DD/MM/YYYY) pour les dates de formation pour le conseiller avec l'id: ${idPGConseiller}`);
            errors++;
          } else if (alreadyRecruted > 0) {
            logger.warn(`Un conseiller avec l'id: ${idPGConseiller} a déjà été recruté`);
            errors++;
            if (formatDate(datePrisePoste) === formatDate(dateFinFormation) && commentaire === '') {
              logger.error(`Conseiller ${idPGConseiller} semble non formé => ${formatDate(datePrisePoste)}-${formatDate(dateFinFormation)} (RECRUTE)`);
            } else if (formatDate(datePrisePoste) !== formatDate(dateFinFormation) && commentaire !== '') {
              logger.error(`Conseiller ${idPGConseiller} semble ne pas etre en attente/exempté => ${formatDate(datePrisePoste)}-${formatDate(dateFinFormation)} (RECRUTE)`);
            } else if (commentaire === '') {
              if ((formatDate(conseillerOriginal.dateFinFormation) !== formatDate(dateFinFormation)) || (formatDate(conseillerOriginal.datePrisePoste) !== formatDate(datePrisePoste))) {
                const loggerDateFormationAvant = `${formatDate(conseillerOriginal.datePrisePoste)}-${formatDate(conseillerOriginal.dateFinFormation)}`;
                const loggerDatePrisePosteApres = `${formatDate(datePrisePoste)}-${formatDate(dateFinFormation)}`;
                if ((formatDate(conseillerOriginal.datePrisePoste) !== formatDate(datePrisePoste)) || (formatDate(conseillerOriginal.dateFinFormation) !== formatDate(dateFinFormation))) {
                  logger.info(`Update : ${loggerDateFormationAvant} => ${loggerDatePrisePosteApres} pour le conseiller avec l'id: ${idPGConseiller} (RECRUTE)`);
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
            } else if (commentaire === 'exempté' && conseillerOriginal?.datePrisePoste !== undefined) {
              await db.collection('conseillers').updateOne({ _id: conseillerOriginal._id }, {
                $unset: {
                  datePrisePoste: '',
                  dateFinFormation: ''
                } });
              await db.collection('misesEnRelation').updateMany({ 'conseiller.$id': conseillerOriginal._id }, {
                $unset: {
                  'conseillerObj.datePrisePoste': '',
                  'conseillerObj.dateFinFormation': ''
                } });
            } else if (commentaire === 'Formation en septembre' && conseillerOriginal?.datePrisePoste !== null) {
              await db.collection('conseillers').updateOne({ _id: conseillerOriginal._id }, {
                $set: {
                  datePrisePoste: null,
                  dateFinFormation: null
                } });
              await db.collection('misesEnRelation').updateMany({ 'conseiller.$id': conseillerOriginal._id }, {
                $set: {
                  'conseillerObj.datePrisePoste': null,
                  'conseillerObj.dateFinFormation': null
                } });
            } else if (!['', 'exempté', 'Formation en septembre'].includes(commentaire)) {
              logger.error(`"${commentaire}" commentaire non géré pour le conseiller avec l'id: ${idPGConseiller} (RECRUTE)`);
            }
          } else if (structure?.contact?.email === conseillerOriginal?.email) {
            logger.error(`Email identique entre le conseiller ${idPGConseiller} et la structure '${structureId}'`);
            Sentry.captureException(`Email identique entre le conseiller ${idPGConseiller} et la structure '${structureId}'`);
            errors++;
          } else if (miseEnRelation === null) {
            logger.error(`Mise en relation introuvable pour la structure avec l'idPG '${structureId}'`);
            Sentry.captureException(`Mise en relation introuvable pour la structure avec l'idPG '${structureId}'`);
            errors++;
          } else if (dateRupture && (dateRupture > miseEnRelation?.dateRecrutement)) {
            logger.error(`Un conseiller avec l'id: ${idPGConseiller} a une date de Rupture ${formatDate(dateRupture)} supérieure à la date de recrutement ${formatDate(miseEnRelation.dateRecrutement)}`);
            errors++;
          } else if (structure?.statut !== 'VALIDATION_COSELEC') {
            logger.error(`La structure ${structureId} est en statut ${structure?.statut} (conseiller: ${idPGConseiller})`);
            Sentry.captureException(`La structure ${structureId} est en statut ${structure?.statut} (conseiller: ${idPGConseiller})`);
            errors++;
          } else if (countMiseEnrelation > dernierCoselec?.nombreConseillersCoselec) {
            logger.error(`La structure ${structureId} a dépassé le quota (conseiller: ${idPGConseiller})`);
            Sentry.captureException(`La structure ${structureId} a dépassé le quota (conseiller: ${idPGConseiller})`);
            errors++;
          } else if (!['', 'exempté', 'Formation en septembre'].includes(commentaire)) {
            logger.error(`"${commentaire}" commentaire non géré pour le conseiller avec l'id: ${idPGConseiller}`);
            errors++;
          } else if (formatDate(datePrisePoste) === formatDate(dateFinFormation) && commentaire === '') {
            logger.error(`Conseiller ${idPGConseiller} semble non formé => ${formatDate(datePrisePoste)}-${formatDate(dateFinFormation)}`);
            errors++;
          } else if (formatDate(datePrisePoste) !== formatDate(dateFinFormation) && commentaire !== '') {
            logger.error(`Conseiller ${idPGConseiller} semble ne pas etre en attente/exempté => ${formatDate(datePrisePoste)}-${formatDate(dateFinFormation)}`);
            errors++;
          } else if (conseillerDoublon) {
            logger.error(`Conseiller ${idPGConseiller} a un doublon avec un statut ${conseillerDoublon?.statut} ${conseillerDoublon?.idPG}`);
            errors++;
          } else {
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
                  password: await bcrypt.hashSync(uuidv4()),
                  roles: Array(role),
                  token: uuidv4(),
                  mailSentDate: null,
                  passwordCreated: false,
                  entity: {
                    '$ref': `${role}s`,
                    '$id': conseillerOriginal._id, //nécessaire si compte candidat pas sur le même doublon
                    '$db': dbName
                  },
                }
              });
            }
            const conseillerCommentaire = [
              { commentaire: 'exempté', update: {} },
              { commentaire: 'Formation en septembre', update: { datePrisePoste: null, dateFinFormation: null } },
              { commentaire: '', update: { datePrisePoste: date(datePrisePoste), dateFinFormation: date(dateFinFormation) } },
            ];
            const conseillerExempte = commentaire === 'exempté' ? { datePrisePoste: '', dateFinFormation: '' } : {};
            await db.collection('conseillers').updateOne({ _id: conseillerOriginal._id }, { $set: {
              statut: 'RECRUTE',
              codeRegionStructure: structure.codeRegion,
              codeDepartementStructure: structure.codeDepartement,
              disponible: false,
              estRecrute: true,
              ...conseillerCommentaire.find(e => e.commentaire === commentaire)?.update,
              structureId: structure._id,
              userCreated: true
            }, $unset: {
              inactivite: '',
              userCreationError: '',
              supHierarchique: '',
              telephonePro: '',
              emailPro: '',
              ...conseillerExempte
            } });
            const conseillerUpdated = await db.collection('conseillers').findOne({ _id: conseillerOriginal._id });

            await db.collection('misesEnRelation').updateOne({ 'conseillerObj.idPG': idPGConseiller, 'structureObj.idPG': structureId, 'statut': 'recrutee' }, {
              $set: {
                statut: 'finalisee',
                conseillerObj: conseillerUpdated
              }
            });

            await db.collection('misesEnRelation').deleteMany(
              {
                'conseillerObj.idPG': idPGConseiller,
                'statut': { $in: ['nouvelle', 'interessee', 'nonInteressee', 'recrutee'] }
              }
            );

            //Mise à jour des doublons
            await db.collection('conseillers').updateMany({ _id: { $ne: conseillerOriginal._id }, email: conseillerOriginal.email }, {
              $set: {
                disponible: false,
                userCreated: false //si compte candidat n'était pas sur le même doublon
              },
              $unset: {
                inactivite: '',
              }
            });

            await db.collection('misesEnRelation').deleteMany(
              {
                'conseillerObj.idPG': { $ne: idPGConseiller },
                'conseillerObj.email': conseillerOriginal.email,
                'statut': { $in: ['nouvelle', 'interessee', 'nonInteressee', 'recrutee'] }
              }
            );

            if (countCras >= 1) {
              logger.info(`Maj de ${countCras} CRAS pour le conseiller avec l'id: ${idPGConseiller}, cras => après la date ${query['$gte'] ? 'recrutement' : 'de rupture'}`);
              await db.collection('cras').updateMany(matchCras, {
                $set: {
                  structure: new DBRef('structures', miseEnRelation.structure.oid, database),
                }
              });
            }
            // Creation boite mail du conseiller
            const gandi = app.get('gandi');
            const nom = slugify(`${conseillerUpdated.nom}`, { replacement: '-', lower: true, strict: true });
            const prenom = slugify(`${conseillerUpdated.prenom}`, { replacement: '-', lower: true, strict: true });
            const login = await fixHomonymesCreateMailbox(gandi, nom, prenom, db);
            const password = uuidv4() + 'AZEdsf;+:!'; // Sera choisi par le conseiller via invitation
            await createMailbox({ gandi, db, logger, Sentry: Sentry })({ conseillerId: conseillerUpdated._id, login, password });
            await sleep(6000);

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
