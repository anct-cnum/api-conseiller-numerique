
const { program } = require('commander');
const { Pool } = require('pg');

const { execute } = require('../../utils');

const pool = new Pool();

execute(__filename, async ({ db, logger, exit, Sentry }) => {
  const getConseiller = async id => {
    try {
      const { rows } = await pool.query(`
        SELECT
          id,
          disponible
        FROM djapp_coach
        WHERE id = $1`,
      [id]);
      return rows;
    } catch (error) {
      logger.info(`Erreur DB for GET Conseiller : ${error.message}`);
      Sentry.captureException(error);
    }
  };

  const updateConseiller = async (id, disponibleChange) => {
    try {
      const { rows } = await pool.query(`
        UPDATE djapp_coach
        SET
          disponible = $2
        WHERE id = $1`,
      [id, disponibleChange]);
      return rows;
    } catch (error) {
      logger.info(`Erreur DB for update Conseiller : ${error.message}`);
      Sentry.captureException(error);
    }
  };

  const deleteConseiller = async id => {
    try {
      const { rows } = await pool.query(`
        DELETE FROM djapp_coach WHERE id = $1`,
      [id]);
      return rows;
    } catch (error) {
      logger.info(`Erreur DB for delete Conseiller : ${error.message}`);
      Sentry.captureException(error);
    }
  };

  const deleteMatchingConseiller = async id => {
    try {
      const { rows } = await pool.query(`
      DELETE FROM djapp_matching WHERE host_id = $1`,
      [id]);
      return rows;
    } catch (error) {
      logger.info(`Erreur DB for delete Conseiller : ${error.message}`);
      Sentry.captureException(error);
    }
  };

  program.option('--supprimer', 'Suppression total d\'un conseiller');
  program.option('--disponible', 'activer le conseiller ');
  program.option('--non-disponible', 'désactiver le conseiller');
  program.option('-i, --id <id>', 'id: id PostgreSQL du conseiller');
  program.helpOption('-e', 'HELP command');
  program.parse(process.argv);

  let id = ~~program.id;
  let disponible = program.disponible;
  let nonDisponible = program.nonDisponible;
  let forceSuppressionTotal = program.supprimer;

  if (id === 0) {
    exit('Paramètres invalides. Veuillez préciser un id');
    return;
  }

  const conseillersCount = await db.collection('conseillers').countDocuments({ idPG: id });

  if (conseillersCount === 0) {
    exit('id PG inconnu dans MongoDB');
    return;
  }

  const conseillersPG = await getConseiller(id);

  if (!conseillersPG || conseillersPG.length === 0) {
    exit('id PG inconnu dans PostgreSQL');
    return;
  }
  const conseiller = await db.collection('conseillers').findOne({ idPG: id });

  if (forceSuppressionTotal === true) {
    // SUPPRESSION TOTAL DU CONSEILLER avec la commande --supprimer
    if (conseiller.userCreated === true) {
      const user = await db.collection('users').findOne({ 'entity.$id': conseiller._id });
      if (user.roles[0] === 'conseiller') {
        exit(`le conseiller: ${conseiller.nom} ${conseiller.prenom} avec l'idPG : ${conseiller.idPG} déjà invité à lespace coop`);
        return;
      }
    }
    try {
      await db.collection('users').deleteOne({ 'entity.$id': conseiller._id });
      await db.collection('misesEnRelation').deleteMany({ 'conseiller.$id': conseiller._id });
      await db.collection('conseillers').deleteOne({ _id: conseiller._id });
      deleteMatchingConseiller(id);// supprimer également dans matching sinon erreur "constraint" coter PG
      deleteConseiller(id);
    } catch (error) {
      logger.error(`Erreur Mongo (delete): ${error.message}`);
      Sentry.captureException(error);
      return;
    }

    logger.info(`Conseiller ${conseiller.nom} ${conseiller.prenom} avec l'id : ${id} est totalement supprimer`);
  } else {
    // CHANGER LE STATUS DISPONIBLE OU NON DISPONIBLE dans 'conseillers' + 'PG djapp_coach' + 'misesEnrelation'
    if (!(disponible ^ nonDisponible)) {
      // eslint-disable-next-line max-len
      exit('Paramètres invalides. Veuillez préciser la disponibilité ou la non disponibilité ou alors lancer la commande --supprimer pour supprimer la totalité d\'un conseiller');
      return;
    }
    let disponibleChange = program.disponible === true;
    try {
      await db.collection('conseillers').updateOne({ idPG: id }, { $set: { disponible: disponibleChange } });
      await db.collection('misesEnRelation').updateMany({ 'conseillerObj.idPG': id }, {
        $set: {
          'conseillerObj.disponible': disponibleChange
        }
      }, {});
      updateConseiller(id, disponibleChange);
    } catch (error) {
      logger.error(`Erreur Mongo (update): ${error.message}`);
      Sentry.captureException(error);
      return;
    }

    logger.info('Disponibilité mis à jour');
  }
  exit();
});
