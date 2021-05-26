
const { program } = require('commander');
const { Pool } = require('pg');

const { execute } = require('../../utils');

const pool = new Pool();

execute(__filename, async ({ db, logger, exit }) => {
  const getConseiller = async id => {
    console.log('id:', id);
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
      logger.info(`Erreur DB : ${error.message}`);
    }
  };

  const updateConseiller = async (id, disponibleChange) => {
    try {
      const { rows } = await pool.query(`
        UPDATE djapp_coach
        SET
          disponible
        WHERE id = $1`,
      [id, disponibleChange]);
      return rows;
    } catch (error) {
      logger.info(`Erreur DB : ${error.message}`);
    }
  };

  program.option('-d, --disponible <true/false>', 'disponible: désactivé le conseiller par la valeur false ');
  program.option('-i, --id <id>', 'id: id PG de la structure');
  program.helpOption('-e', 'HELP command');
  program.parse(process.argv);

  let id = ~~program.id;
  let disponible = program.disponible;

  if (id === 0 || !disponible) {
    exit('Paramètres invalides. Veuillez préciser un id et une valeur sois true ou false pour la disponibilité');
    return;
  }

  const conseillers = await db.collection('conseillers').find({ idPG: id }).toArray();
  console.log('conseillers:', conseillers);

  if (conseillers.length === 0) {
    exit('id PG inconnu dans MongoDB');
    return;
  }

  const conseillersPG = await getConseiller(id);
  console.log('conseillersPG:', conseillersPG);

  if (!conseillersPG || conseillersPG.length === 0) {
    exit('id PG inconnu dans PostgreSQL');
    return;
  }
  const conseillerPG = conseillersPG[0];

  let disponibleChange = {};
  disponibleChange.disponible = program.disponible || conseillerPG.conseiller;

  updateConseiller(id, disponibleChange);

  await db.collection('conseillers').updateOne({ idPG: id }, { $set: {
    disponible: disponibleChange.disponible
  } }, {});

  logger.info('Disponibilité mis à jour');
  exit();
});
