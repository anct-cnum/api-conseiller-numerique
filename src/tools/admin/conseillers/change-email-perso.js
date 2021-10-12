const { program } = require('commander');
const { execute } = require('../../utils');
const { Pool } = require('pg');
const pool = new Pool();

execute(__filename, async ({ db, logger, Sentry, exit }) => {

  program.option('-e, --email <email>', 'email: nouvelle adresse mail');
  program.option('-i, --id <id>', 'id: id PG du conseiller');
  program.option('-t, --type <type>', `type: candidat ou un conseiller`);
  program.helpOption('-e', 'HELP command');
  program.parse(process.argv);

  let id = ~~program.id;
  let email = program.email;
  let type = program.type;

  if (id === 0 || !email) {
    exit('Paramètres invalides. Veuillez préciser un id et le nouveau email à changer');
    return;
  }
  if (!['candidat', 'conseiller'].includes(type)) {
    exit('Paramètres invalides. Veuillez préciser un type: candidat ou conseiller');
    return;
  }
  const conseiller = await db.collection('conseillers').findOne({ idPG: id });
  const { roles } = await db.collection('users').findOne({ 'entity.$id': conseiller._id });

  if (conseiller === null) {
    exit('id PG inconnu dans MongoDB');
    return;
  }

  if (roles[0] !== type) {
    exit(`Le conseiller id=${id} n'est pas de type ${type} mais ${roles[0]}`);
    return;
  }
  try {
    await pool.query(`UPDATE djapp_coach
    SET email = $2 WHERE id = $1`,
    [id, email]);
  } catch (error) {
    logger.error(error.message);
    Sentry.captureException(error);
    return;
  }

  try {
    await db.collection('conseillers').updateOne({ idPG: id }, { $set: { email: email } });
    await db.collection('misesEnRelation').updateMany(
      { 'conseiller.$id': conseiller._id },
      { $set: { 'conseillerObj.email': email }
      });
    if (type === 'candidat') {
      await db.collection('users').updateOne({ 'entity.$id': conseiller._id }, { $set: { name: email } });
    }

  } catch (error) {
    logger.error(error.message);
    Sentry.captureException(error);
    return;
  }

  logger.info(`Email perso : ${conseiller.email} changer par => ${email} pour le conseiller avec l'id ${id}`);
  exit();
});
