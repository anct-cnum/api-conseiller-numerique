const { program } = require('commander');
const { execute } = require('../../utils');
const createEmails = require('../../../emails/emails');
const createMailer = require('../../../mailer');
const { v4: uuidv4 } = require('uuid');

execute(__filename, async ({ db, logger, Sentry, exit, app }) => {

  program.option('-i, --id <id>', 'id: id PG du conseiller');
  program.helpOption('-e', 'HELP command');
  program.parse(process.argv);

  let id = ~~program.id;

  if (id === 0) {
    exit('Paramètre invalide. Veuillez préciser un id !');
    return;
  }

  const conseiller = await db.collection('conseillers').findOne({ idPG: id });

  if (conseiller === null) {
    exit('id PG inconnu dans MongoDB');
    return;
  }
  const { roles, _id } = await db.collection('users').findOne({ 'entity.$id': conseiller._id });

  if (!roles.includes('conseiller')) {
    exit(`Ce conseiller à un rôle : ${roles}`);
    return;
  }

  await db.collection('users').updateOne({ _id }, { $set: { token: uuidv4() } });

  try {
    const user = await db.collection('users').findOne({ 'entity.$id': conseiller._id });
    let mailer = createMailer(app);
    const emails = createEmails(db, mailer, app);
    let message = emails.getEmailMessageByTemplateName('creationCompteConseiller');
    await message.send(user);
  } catch (error) {
    logger.error(error);
    Sentry.captureException(error);
    return;
  }

  logger.info(`invitation à l'espace COOP envoyé au conseiller id:${conseiller._id}`);
  exit();
});
