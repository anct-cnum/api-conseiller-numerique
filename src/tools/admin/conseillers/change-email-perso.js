const { program } = require('commander');
const { execute } = require('../../utils');
const { Pool } = require('pg');
const pool = new Pool();

execute(__filename, async ({ db, logger, Sentry, exit }) => {

  program.option('-e, --email <email>', 'email: nouvelle adresse mail');
  program.option('-i, --id <id>', 'id: id PG du conseiller');
  program.option('-t, --type <id>', `id: déficfinir si c'est un candidat ou un conseiller`);
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
    exit('Paramètres invalides. Veuillez un type : candidat ou conseiller');
    return;
  }
  const conseiller = await db.collection('conseillers').findOne({ idPG: id });
  const { roles, name } = await db.collection('users').findOne({ 'entity.$id': conseiller._id });
  let role = roles[0];

  if (conseiller === null) {
    exit('id PG inconnu dans MongoDB');
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
    if (role !== type) {
      // eslint-disable-next-line max-len
      exit(`Nous avons pas changer le nouveau email dans la collection users car le conseiller avec l'id ${id} à un role : ${roles} avec comme name ${name} ! Ce qui n'a pas empecher le changement dans la collection conseillers/misesEnRelation & dans PG ( ${conseiller.email} par => ${email})`);
      return;
    }
    await db.collection('users').updateOne({ 'entity.$id': conseiller._id }, { $set: { name: email } });
  } catch (error) {
    logger.error(error.message);
    Sentry.captureException(error);
    return;
  }

  logger.info(`Email perso : ${conseiller.email} changer par => ${email} pour le conseiller avec l'id ${id}`);
  exit();
});
