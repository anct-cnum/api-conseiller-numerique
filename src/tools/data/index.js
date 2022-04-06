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

program.option('-a, --anonymisation', 'anonymisation de la bd de recette');
program.option('-u, --update', 'update: update de la collection user et mise en relation');
program.helpOption('-e', 'HELP command');
program.parse(process.argv);

execute(__filename, async ({ db, logger, Sentry, exit, app }) => {
  await new Promise(async (resolve, reject) => {
    const anonymisation = program.anonymisation;
    const miseAjourUserANDMiseEnRelation = program.update;
    const whiteList = ['local', 'recette'];
    const mongodb = app.get('mongodb');
    if (!whiteList.includes(process.env.SENTRY_ENVIRONMENT.toLowerCase()) || (!mongodb.includes('local') && !mongodb.includes('bezikra'))) {
      exit('Ce script ne peut être lancé qu\'en local ou en recette !');
      return;
    }
    if (!miseAjourUserANDMiseEnRelation && !anonymisation) {
      exit('Veuillez choisir au moins une option entre --anonymisation ou --update');
      return;
    }
    try {
    // ETAPE 1 ANONYMISER LES CONSEILLERS ET LES STRUCTURES
      if (anonymisation) {
        logger.info('Etape "Anonymisation" des collections conseillers & structures');
        // PARTIE CONSEILLER
        await anonymisationConseiller(db, logger);
        // PARITE STRUCTURE
        await anonymisationStructure(db, logger);
      }
      // ETAPE 2 METTRE a jour les collections: MISESENRELATION & USERS !
      if (miseAjourUserANDMiseEnRelation) {
        logger.info('Etape "Mise à jour" des collections misesEnRelation & users');
        // PARITE STRUCTURE
        await updateMiseEnRelationAndUserStructure(db, logger);
        // PARTIE CONSEILLER
        await updateMiseEnRelationAndUserConseiller(db, logger);
      }
    } catch (error) {
      logger.error(error);
      Sentry.captureException(error);
      return;
    }
    resolve();
  });
});
