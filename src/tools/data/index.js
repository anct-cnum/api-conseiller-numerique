const { program } = require('commander');
const { execute } = require('../utils');
const bcrypt = require('bcryptjs');
const {
  anonymisationConseiller,
  updateMiseEnRelationAndUserConseiller
} = require('./tasks/conseiller');
const {
  anonymisationStructure,
  updateMiseEnRelationAndUserStructure
} = require('./tasks/structure');
const {
  createCompteFixPrefetDepartement,
  createCompteFixPrefetRegion,
  createCompteFixAdmin,
  createCompteFixCandidat,
  createCompteFixCnfs,
  createCompteFixCnfsCoordo,
  createCompteFixStructure,
  createCompteFixCHub
} = require('./tasks/compte-fix');
const {
  deleteUsersSolo,
  indexMongoConseillers
} = require('./tasks/requete-mongo');

const configPG = {
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
  db: process.env.PGDATABASE,
  port: process.env.PGPORT,
  sslMode: process.env.PGSSLMODE,
  host: process.env.PGHOST
};
program.option('-l, --limit <limit>', 'limit: définir un nombre');
program.option('-c, --collection <collection>', 'collection: conseiller ou structure');
program.option('-d, --delete', 'delete: suprimer toute les mises en relation avec le statut non disponible ou finalisee_non_disponible');
program.option('-f, --fix', 'fix: creation compte de test fixe');
program.option('-p, --password <password>', 'password: password pour les comptes fix');
program.helpOption('-e', 'HELP command');
program.parse(process.argv);

execute(__filename, async ({ db, logger, Sentry, exit, app }) => {
  await new Promise(async resolve => {
    const limit = ~~program.limit;
    const collection = program.collection;
    const deleteDataNonDispoAndUsersExterne = program.delete;
    const compteFix = program.fix;
    let password = program.password;
    const whiteList = ['local', 'recette'];
    const mongodb = app.get('mongodb');
    if (Object.values(configPG).includes(undefined)) {
      exit(`ATTENTION : les 6 vars d'env PG n'ont pas été configurées`);
      return;
    }
    if ((!process.env.PGHOST.includes('local') && !process.env.PGHOST.includes('test')) || !whiteList.includes(process.env.SENTRY_ENVIRONMENT.toLowerCase()) || (!mongodb.includes('local') && !mongodb.includes('bezikra')) || (process.env.CAN_ANONYMIZE_FAKER !== 'true')) {
      exit('Ce script ne peut être lancé qu\'en local ou en recette !');
      return;
    }
    if (!deleteDataNonDispoAndUsersExterne && !compteFix) {
      if (!['conseiller', 'structure'].includes(collection)) {
        exit('Veuillez choisir au moins une option la collection: conseiller ou structure');
        return;
      }
    }
    const findIndexMongo = await indexMongoConseillers(db);
    if (findIndexMongo.length <= 5) {
      exit('Veuillez créer les indexes mongo de chaque collection');
      return;
    }
    if (compteFix) {
      if (!password) {
        exit('Veuillez choisir un mot de passe');
        return;
      }
    }
    try {
      if (deleteDataNonDispoAndUsersExterne) {
        await deleteUsersSolo(db);
      }
      if (compteFix) {
        const connection = app.get('mongodb');
        const database = connection.substr(connection.lastIndexOf('/') + 1);
        password = await bcrypt.hashSync(password);
        await createCompteFixPrefetDepartement(db, logger, password);
        await createCompteFixPrefetRegion(db, logger, password);
        await createCompteFixAdmin(db, logger, password);
        await createCompteFixCandidat(db, logger, password, database);
        await createCompteFixCnfs(db, logger, password, database);
        await createCompteFixCnfsCoordo(db, logger, password, database);
        await createCompteFixStructure(db, logger, password, database);
        await createCompteFixCHub(db, logger, password);
      }
      if (collection === 'conseiller') {
        // ETAPE 1 ANONYMISER LES CONSEILLERS
        await anonymisationConseiller(db, logger, limit);
        // ETAPE 2 METTRE a jour les collections: MISESENRELATION & USERS !
        await updateMiseEnRelationAndUserConseiller(db, logger, limit);
      }
      if (collection === 'structure') {
        // ETAPE 1 ANONYMISER LES STRUCTURES
        await anonymisationStructure(db, logger, limit);
        // ETAPE 2 METTRE a jour les collections: MISESENRELATION & USERS !
        await updateMiseEnRelationAndUserStructure(db, logger, limit);
      }
    } catch (error) {
      logger.error(error);
      Sentry.captureException(error);
      return;
    }
    resolve();
  });
});
