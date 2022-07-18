const { program } = require('commander');
const { execute } = require('../../utils');
const { Pool } = require('pg');
const pool = new Pool();

execute(__filename, async ({ db, logger, Sentry, exit }) => {

  program.option('-e, --email <email>', 'email: nouvelle adresse mail');
  program.option('-i, --id <id>', 'id: id PG du conseiller');
  program.option('-t, --type <type>', `type: candidat ou conseiller`);
  program.option('-u, --user', `user: changement également dans user`);
  program.helpOption('-e', 'HELP command');
  program.parse(process.argv);

  let id = ~~program.id;
  let email = program.email;
  let type = program.type;
  let user = program.user;

  if (id === 0 || !email) {
    exit('Paramètres invalides. Veuillez préciser un id et le nouveau email à changer');
    return;
  }
  if (!['candidat', 'conseiller'].includes(type)) {
    exit('Paramètres invalides. Veuillez préciser un type: candidat ou conseiller');
    return;
  }
  if (type === 'candidat' || user) {
    const emailCount = await db.collection('users').countDocuments({ name: email });
    if (emailCount === 1) {
      exit(`L'email : ${email} est dédà existant dans la collection users`);
      return;
    }
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
    logger.error(error);
    Sentry.captureException(error);
    return;
  }

  try {
    await db.collection('conseillers').updateOne({ idPG: id }, { $set: { email: email } });
    await db.collection('misesEnRelation').updateMany(
      { 'conseiller.$id': conseiller._id },
      { $set: { 'conseillerObj.email': email }
      });
    if (type === 'candidat' || user) {
      await db.collection('users').updateOne({ 'entity.$id': conseiller._id }, { $set: { name: email } });
    }

  } catch (error) {
    logger.error(error);
    Sentry.captureException(error);
    return;
  }

  logger.info(`Email perso : ${conseiller.email} changer par => ${email} pour le conseiller avec l'id ${id}`);
  exit();
});
