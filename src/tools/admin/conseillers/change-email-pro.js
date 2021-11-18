const { program } = require('commander');
const { execute } = require('../../utils');
const { updateMailboxLogin } = require('../../../utils/mailbox');

execute(__filename, async ({ db, logger, Sentry, exit, gandi }) => {

  program.option('-e, --email <email>', 'email: nouvelle adresse mail');
  program.option('-i, --id <id>', 'id: id PG du conseiller');
  program.option('-p, --password <password>', 'password du conseiller');
  program.helpOption('-e', 'HELP command');
  program.parse(process.argv);

  let id = ~~program.id;
  let email = program.email;
  let password = program.password;

  if (id === 0 || !email || !password) {
    exit('Paramètres invalides. Veuillez préciser un id et le nouveau email @conseiller-numerique.fr ainsi que le mot de passe');
    return;
  }

  const conseiller = await db.collection('conseillers').findOne({ idPG: id });
  const conseillerId = conseiller._id;
  // const login = conseiller.emailCN.address;
  const login = 'julien.dupont';

  if (conseiller === null) {
    exit('idPG inconnu, conseiller non trouvé');
    return;
  }

  try {
    // console.log('conseillerId:', conseillerId);
    // console.log('gandi:', gandi);
    // console.log('login:', login);
    await updateMailboxLogin(gandi, conseillerId, email, login, password, db, logger, Sentry);
    // await db.collection('users').updateOne({ 'entity.$id': conseiller._id }, { $set: { name: email } });
  } catch (error) {
    logger.error(error);
    Sentry.captureException(error);
    return;
  }

  logger.info(`Email professionnelle : ${conseiller.emailCN.address} changer par => ${email} pour le conseiller avec l'id ${id}`);
  exit();
});
