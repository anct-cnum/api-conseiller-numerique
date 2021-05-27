
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

  program.option('--disponible', 'disponible: activer le conseiller ');
  program.option('--non-disponible', 'disponible: false (Non disponible) ');
  program.option('-i, --id <id>', 'id: id PG du conseiller');
  program.helpOption('-e', 'HELP command');
  program.parse(process.argv);

  let id = ~~program.id;
  const options = program.opts();
  let result = [];

  if (options.disponible) {
    result.push('true');
  }
  if (options.nonDisponible) {
    result.push('false');
  }

  let disponible = options;

  if (id === 0 || !(disponible !== 'true' || disponible !== 'false')) {
    exit('Paramètres invalides. Veuillez préciser un id et une valeur sois true ou false pour la disponibilité');
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

  let disponibleChange = result[0] === 'true';

  updateConseiller(id, disponibleChange);

  await db.collection('conseillers').updateOne({ idPG: id }, { $set: {
    disponible: disponibleChange
  } }, {});

  logger.info('Disponibilité mis à jour');
  exit();
});
