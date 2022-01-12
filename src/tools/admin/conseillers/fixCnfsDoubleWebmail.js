const { program } = require('commander');
const { execute } = require('../../utils');
const { loginAPI } = require('../../../utils/mattermost');
const slugify = require('slugify');
const axios = require('axios');

const updateEmailCN = (db, gandi) => async (loginOk, conseiller, id) => {
  await db.collection('conseillers').updateOne({ idPG: id }, { $set: { 'emailCN.address': `${loginOk}@${gandi.domain}` } });
  await db.collection('users').updateOne({ 'entity.$id': conseiller._id }, { $set: { 'name': `${loginOk}@${gandi.domain}` } });
  await db.collection('misesEnRelation').updateMany(
    { 'conseiller.$id': conseiller._id },
    { $set: { 'conseillerObj.emailCN.address': `${loginOk}@${gandi.domain}` }
    });
};
const updateLoginMattermost = (mattermost, gandi, db) => async (conseiller, loginOk) => {
  const token = await loginAPI({ mattermost });
  await axios({
    method: 'put',
    url: `${mattermost.endPoint}/api/v4/users/${conseiller.mattermost?.id}/patch`,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    data: {
      'username': loginOk,
      'email': `${loginOk}@${gandi.domain}`
    }
  });
  await db.collection('conseillers').updateOne({ _id: conseiller._id }, { $set: { 'mattermost.login': loginOk } });
  await db.collection('misesEnRelation').updateMany(
    { 'conseiller.$id': conseiller._id },
    { $set: { 'conseillerObj.mattermost.login': loginOk }
    });
};

const deleteMailBoxDoublon = (gandi, logger) => async loginSupprime => {
  const mailbox = await axios({
    method: 'get',
    url: `${gandi.endPoint}/mailboxes/${gandi.domain}?login=${loginSupprime}`,
    headers: {
      'Authorization': `Apikey ${gandi.token}`
    }
  });
  if (mailbox?.data.length === 1) {
    const resultDeleteMailbox = await axios({
      method: 'delete',
      url: `${gandi.endPoint}/mailboxes/${gandi.domain}/${mailbox.data[0].id}`,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Apikey ${gandi.token}`
      }
    });
    logger.info(`le statut pour la suppression de ${loginSupprime}@${gandi.domain} est ${resultDeleteMailbox.status}`);
  }
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
    logger.info(`On conserve ${loginOk}@${gandi.domain} et on supprime ${loginSupprime}@${gandi.domain} ...`);
    await deleteMailBoxDoublon(gandi, logger)(loginSupprime);
    await updateEmailCN(db, gandi)(loginOk, conseiller, id);
    await updateLoginMattermost(mattermost, gandi, db)(conseiller, loginOk);
  } catch (error) {
    logger.error(error);
    Sentry.captureException(error);
  }
  logger.info(`Le login est bien => ${loginOk}@${gandi.domain} pour le conseiller id=${conseiller._id}`);
  exit();
});
