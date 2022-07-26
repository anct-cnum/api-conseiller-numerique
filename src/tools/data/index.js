const { program } = require('commander');
const { execute } = require('../utils');
const {
  anonymisationConseiller,
  updateMiseEnRelationAndUserConseiller
} = require('./tasks/conseiller');
const {
  anonymisationStructure,
  updateMiseEnRelationAndUserStructure
} = require('./tasks/structure');

const {
  deleteStatutNonDispoMisesEnRelation
} = require('./tasks/requete-mongo');

program.option('-l, --limit <limit>', 'limit: définir un nombre');
program.option('-c, --collection <collection>', 'collection: conseiller ou structure');
program.option('-d, --delete', 'delete: suprimer toute les mises en relation avec le statut non disponible ou finalisee_non_disponible');
program.helpOption('-e', 'HELP command');
program.parse(process.argv);

execute(__filename, async ({ db, logger, Sentry, exit, app }) => {
  // eslint-disable-next-line no-unused-vars
  await new Promise(async (resolve, reject) => {
    const limit = ~~program.limit;
    const collection = program.collection;
    const deleteDataNonDispo = program.delete;
    const whiteList = ['local', 'recette'];
    const mongodb = app.get('mongodb');
    if (!whiteList.includes(process.env.SENTRY_ENVIRONMENT.toLowerCase()) || (!mongodb.includes('local') && !mongodb.includes('bezikra'))) {
      exit('Ce script ne peut être lancé qu\'en local ou en recette !');
      return;
    }
    if (!deleteDataNonDispo) {
      if (!['conseiller', 'structure'].includes(collection)) {
        exit('Veuillez choisir au moins une option la collection: conseiller ou structure');
        return;
      }
    }
    try {
      if (deleteDataNonDispo) {
        await deleteStatutNonDispoMisesEnRelation(db);
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
