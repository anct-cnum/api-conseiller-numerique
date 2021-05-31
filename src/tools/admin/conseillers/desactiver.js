
const { program } = require('commander');
const { Pool } = require('pg');

const { execute } = require('../../utils');

const pool = new Pool();

execute(__filename, async ({ db, logger, exit }) => {
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
    }
  };

  program.option('--disponible', 'activer le conseiller ');
  program.option('--non-disponible', 'désactiver le conseiller');
  program.option('-i, --id <id>', 'id: id PostgreSQL du conseiller');
  program.helpOption('-e', 'HELP command');
  program.parse(process.argv);

  let id = ~~program.id;
  let disponible = program.disponible;
  let nonDisponible = program.nonDisponible;

  if (id === 0 || (disponible ^ nonDisponible)) {
    exit('Paramètres invalides. Veuillez préciser un id et la disponibilité ou la non disponibilité');
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
  let disponibleChange = program.disponible === true;
  updateConseiller(id, disponibleChange);

  await db.collection('conseillers').updateOne({ idPG: id }, { $set: {
    disponible: disponibleChange
  } }, {});

  logger.info('Disponibilité mis à jour');
  exit();
});
