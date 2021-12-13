const { program } = require('commander');
const { execute } = require('../../utils');
const slugify = require('slugify');
const createEmails = require('../../../emails/emails');
const createMailer = require('../../../mailer');
const { getMailBox } = require('../../../utils/mailbox');
const { v4: uuidv4 } = require('uuid');

execute(__filename, async ({ app, db, logger, Sentry, exit, gandi }) => {

  program.option('-n, --nom <nom>', 'nom: nouveau nom');
  program.option('-p, --prenom <prenom>', 'prenom: nouveau prenom');
  program.option('-i, --id <id>', 'id: id PG du conseiller');
  program.helpOption('-h', 'HELP command');
  program.parse(process.argv);

  const id = ~~program.id;
  let nom = program.nom;
  let prenom = program.prenom;
  let login;
  if (id === 0 || (!nom && !prenom)) {
    exit('Paramètres invalides. Veuillez préciser un id et un nom et/ou prenom');
    return;
  }

  const conseiller = await db.collection('conseillers').findOne({ idPG: id });
  if (conseiller === null) {
    exit('idPG inconnu, conseiller non trouvé');
    return;
  }
  const compteUser = await db.collection('users').findOne({ 'entity.$id': conseiller._id });
  if (compteUser === null) {
    exit('idPG inconnu, conseiller non trouvé');
    return;
  }
  const condition1 = prenom ? prenom : conseiller?.prenom;
  const condition2 = nom ? nom : conseiller?.nom;
  prenom = slugify(`${condition1}`, { replacement: '-', lower: true, strict: true });
  nom = slugify(`${condition2}`, { replacement: '-', lower: true, strict: true });
  login = `${prenom}.${nom}`;

  conseiller.message_email = {
    email_actuelle: conseiller?.emailCN?.address,
    email_future: `${login}@${gandi.domain}`
  };
  conseiller.support_cnfs = {
    login,
    nouveauEmail: `${login}@${gandi.domain}`,
    prenom,
    nom
  };
  try {
    await db.collection('users').updateOne({ 'entity.$id': conseiller._id }, { $set: { token: uuidv4() } });
    const mailbox = await getMailBox({ gandi, login });
    if (mailbox.data.length === 0) {
      const user = await db.collection('users').findOne({ 'entity.$id': conseiller._id });
      conseiller.token = user.token;
      // Envoi email pour que l'utilisateur entre son mot de passe lui même
      let mailer = createMailer(app);
      const emails = createEmails(db, mailer, app, logger);
      let message = emails.getEmailMessageByTemplateName('conseillerChangeEmailCnfs');
      await message.send(conseiller);
      await db.collection('users').updateOne({ 'entity.$id': conseiller._id }, { $set: { 'support_cnfs': conseiller.support_cnfs } });
      // eslint-disable-next-line max-len
      logger.info(`Envoi e-mail pour la demande de changement d'email professionnel : ${conseiller?.emailCN?.address} par => ${login}@${gandi.domain} pour le conseiller avec l'id ${id}`);
    } else {
      logger.error(`une adresse mail existe déjà pour: ${mailbox.data[0].address}`);
    }
  } catch (error) {
    logger.error(error);
    Sentry.captureException(error);
    return;
  }
  exit();
});
