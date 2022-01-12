const { program } = require('commander');
const { execute } = require('../../utils');
const { updateJustLoginMattermost } = require('../../../utils/mattermost');
const { deleteMailBoxDoublon } = require('../../../utils/mailbox');
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
  const login = program.login;

  if (id === 0 || !id || !['ancien', 'nouveau'].includes(login)) {
    exit('Paramètres invalides. Veuillez préciser un id et un login en choisissant ancien ou login');
    return;
  }
  const conseiller = await db.collection('conseillers').findOne({ idPG: id });

  const ancien = value => slugify(`${value}`, { replacement: '.', lower: true, strict: true });
  const nouveau = value => slugify(`${value}`, { replacement: '-', lower: true, strict: true });

  let prenomOption1 = nouveau(conseiller.prenom);
  let nomOption1 = nouveau(conseiller.nom);
  let prenomOption2 = ancien(conseiller.prenom);
  let nomOption2 = ancien(conseiller.nom);
  const loginOption1 = `${prenomOption1}.${nomOption1}`;
  const loginOption2 = `${prenomOption2}.${nomOption2}`;
  const loginSupprime = login === 'nouveau' ? loginOption2 : loginOption1;
  const loginOk = login === 'ancien' ? loginOption2 : loginOption1;

  try {
    await deleteMailBoxDoublon(gandi, logger)(loginSupprime);
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
    await updateJustLoginMattermost(mattermost, gandi, db, logger)(conseiller, loginOk);
  } catch (error) {
    logger.error(error);
    Sentry.captureException(error);
    return;
  }

  logger.info(`Suppression de ${loginSupprime}@${gandi.domain} effectuée`);
  exit();
});
