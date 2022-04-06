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

execute(__filename, async ({ db, logger, Sentry, exit }) => {
  await new Promise(async (resolve, reject) => {
    const anonymisation = program.anonymisation;
    const miseAjourUserANDMiseEnRelation = program.update;

    if (!miseAjourUserANDMiseEnRelation && !anonymisation) {
      exit('Veuillez choisir au moins une option');
      return;
    }

    try {
    // ETAPE 1 ANONYMISER LES CONSEILLERS ET LES STRUCTURES
      if (anonymisation) {
        logger.info('Etape "Anonymisation" des collections conseillers & structures');
        // PARTIE CONSEILLER   // TEST OK ICI
        await anonymisationConseiller(db, logger);//....
        // PARITE STRUCTURE // TEST OK ICI
        await anonymisationStructure(db, logger);//....
      }
      // ETAPE 2 METTRE a jour les collections: MISESENRELATION & USERS !
      if (miseAjourUserANDMiseEnRelation) {
        logger.info('Etape "Mise à jour" des collections misesEnRelation & users');
        // STRUCTURE // TEST OK
        await updateMiseEnRelationAndUserStructure(db, logger);//....
        // Conseiller TEST ok
        await updateMiseEnRelationAndUserConseiller(db, logger);//....
      }
    } catch (error) {
      logger.error(error);
      Sentry.captureException(error);
      return;
    }
    resolve();
  });
});
