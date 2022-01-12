const { program } = require('commander');
const { execute } = require('../../utils');
const { updateLogin } = require('../../../utils/mattermost');
const { deleteMailbox } = require('../../../utils/mailbox');
const slugify = require('slugify');

const updateEmailCN = (db, gandi, logger) => async (login, conseiller, id) => {
  await db.collection('conseillers').updateOne({ idPG: id }, { $set: { 'emailCN.address': `${login}@${gandi.domain}` } });
  await db.collection('users').updateOne({ 'entity.$id': conseiller._id }, { $set: { 'name': `${login}@${gandi.domain}` } });
  await db.collection('misesEnRelation').updateMany(
    { 'conseiller.$id': conseiller._id },
    { $set: { 'conseillerObj.emailCN.address': `${login}@${gandi.domain}` }
    });
  logger.info(`Mise à jour du login Coop ${login} pour le conseiller id=${conseiller._id}`);
};

execute(__filename, async ({ db, logger, Sentry, exit, gandi, mattermost }) => {

  program.option('-i, --id <id>', 'id: id PG du conseiller');
  program.option('-l, --login <login>', 'login: lequel à conserver, il faut choisir entre nouveau(-) ou ancien(.)');
  program.helpOption('-e', 'HELP command');
  program.parse(process.argv);

  let id = ~~program.id;
  const loginCommander = program.login;

  if (id === 0 || !id || !['ancien', 'nouveau'].includes(loginCommander)) {
    exit('Paramètres invalides. Veuillez préciser un id et un login en choisissant ancien ou login');
    return;
  }
  const conseiller = await db.collection('conseillers').findOne({ idPG: id });

  const conversionLogin = (value, parametre) => slugify(`${value}`, { replacement: `${parametre}`, lower: true, strict: true });
  const loginOptionNouveau = `${conversionLogin(conseiller.prenom, '-')}.${conversionLogin(conseiller.nom, '-')}`;
  const loginOptionAncien = `${conversionLogin(conseiller.prenom, '.')}.${conversionLogin(conseiller.nom, '.')}`;

  const loginSupprime = loginCommander === 'nouveau' ? loginOptionAncien : loginOptionNouveau;
  const loginOk = loginCommander === 'ancien' ? loginOptionAncien : loginOptionNouveau;

  try {
    await deleteMailbox(gandi, db, logger, Sentry)(conseiller._id, loginSupprime);
  } catch (error) {
    logger.error(error);
    Sentry.captureException(error);
    return;
  }

  try {
    await updateEmailCN(db, gandi, logger)(loginOk, conseiller, id);
  } catch (error) {
    logger.error(error);
    Sentry.captureException(error);
    return;
  }

  try {
    await updateLogin(mattermost, gandi, logger)(conseiller, loginOk);
    await db.collection('conseillers').updateOne({ _id: conseiller._id }, { $set: { 'mattermost.login': loginOk } });
    await db.collection('misesEnRelation').updateMany(
      { 'conseiller.$id': conseiller._id },
      { $set: { 'conseillerObj.mattermost.login': loginOk }
      });
  } catch (error) {
    logger.error(error);
    Sentry.captureException(error);
    return;
  }

  logger.info(`Suppression de ${loginSupprime}@${gandi.domain} effectuée`);
  exit();
});
