const { program } = require('commander');
const { execute } = require('../../utils');
const { Pool } = require('pg');
const pool = new Pool();

execute(__filename, async ({ db, logger, Sentry, exit }) => {

  program.option('-e, --email <email>', 'email: nouvelle adresse mail');
  program.option('-i, --id <id>', 'id: id PG du conseiller');
  program.option('-t, --type <type>', `type: candidat ou conseiller`);
  program.option('-u, --user', `user: changement également dans user`);
  program.option('-ech, --echange', `echange: echange des emails entre les 2 profils`);
  program.helpOption('-e', 'HELP command');
  program.parse(process.argv);

  let id = ~~program.id;
  let email = program.email;
  let type = program.type;
  let user = program.user;
  let echange = program.echange ?? false;

  if (id === 0 || !email) {
    exit('Paramètres invalides. Veuillez préciser un id et le nouveau email à changer');
    return;
  }
  if (!['candidat', 'conseiller'].includes(type)) {
    exit('Paramètres invalides. Veuillez préciser un type: candidat ou conseiller');
    return;
  }
  const conseiller = await db.collection('conseillers').findOne({ idPG: id });
  const compteExistants = await db.collection('users').findOne({ name: email });
  if (type === 'candidat' || user) {
    let emailCount = await db.collection('users').countDocuments({ name: email });
    if (emailCount === 1 && !echange) {
      exit(`L'email : ${email} est déjà existant dans la collection users`);
      return;
    }
    // Au cas où si il y a un doublon qui empeche le changement, temporairement je met un 'change'pour éviter d'etre bloqué lors du changement plus bas
    if (echange) {
      await db.collection('conseillers').updateOne({ _id: compteExistants.entity.oid }, { '$set': { email: `change${conseiller.email}` } });
      await db.collection('users').updateOne({ _id: compteExistants._id }, { '$set': { name: `change${conseiller.email}` } });
    }
  }

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
    if (echange) {
      await db.collection('conseillers').updateOne({ email: `change${conseiller.email}` }, { '$set': { email: `${conseiller.email}` } });
      await db.collection('users').updateOne({ name: `change${conseiller.email}` }, { '$set': { name: `${conseiller.email}` } });
      await db.collection('misesEnRelation').updateMany(
        { 'conseiller.$id': compteExistants._id },
        { $set: { 'conseillerObj.email': conseiller.email }
        });
    }
  } catch (error) {
    logger.error(error);
    Sentry.captureException(error);
    return;
  }

  logger.info(`Email perso : ${conseiller.email} changer par => ${email} pour le conseiller avec l'id ${id}`);
  exit();
});
