const { program } = require('commander');
const { execute } = require('../../utils');
const { deleteMailbox } = require('../../../utils/mailbox');
const inquirer = require('inquirer');
const slugify = require('slugify');

const updateEmailCN = (db, gandi) => async (answer, conseiller, id) => {
  await db.collection('conseillers').updateOne({ idPG: id }, { $set: { 'emailCN.address': `${answer.choix_login_webmail}@${gandi.domain}` } });
  await db.collection('users').updateOne({ idPG: id }, { $set: { 'name': `${answer.choix_login_webmail}@${gandi.domain}` } });
  await db.collection('misesEnRelation').updateMany(
    { 'conseiller.$id': conseiller._id },
    { $set: { 'conseillerObj.emailCN.address': `${answer.choix_login_webmail}@${gandi.domain}` }
    });
};

execute(__filename, async ({ db, logger, Sentry, exit, gandi }) => {

  program.option('-i, --id <id>', 'id: id PG du conseiller');
  program.helpOption('-e', 'HELP command');
  program.parse(process.argv);
  let id = ~~program.id;
  if (id === 0 || !id) {
    exit('Paramètres invalides. Veuillez préciser un id');
    return;
  }
  const ancien = value => slugify(`${value}`, { replacement: '.', lower: true, strict: true });
  const nouveau = value => slugify(`${value}`, { replacement: '-', lower: true, strict: true });

  const conseiller = await db.collection('conseillers').findOne({ idPG: id });

  let prenomOption1 = nouveau(conseiller.prenom);
  let nomOption1 = nouveau(conseiller.nom);
  let prenomOption2 = ancien(conseiller.prenom);
  let nomOption2 = ancien(conseiller.nom);
  const loginOption1 = `${prenomOption1}.${nomOption1}`;
  const loginOption2 = `${prenomOption2}.${nomOption2}`;

  inquirer
  .prompt([
    {
      name: 'choix_login_webmail',
      type: 'list',
      message: 'Quel webmail/login voulez vous conservez ?',
      choices: [`${loginOption1}`, `${loginOption2}`]
    },
    {
      name: 'confirm_answer',
      type: 'confirm',
      message: 'Etes vous sure d\'avoir bien choisi le bon à conserver ?'
    },
  ])
  .then(async answer => {
    if (answer.confirm_answer) {
      const loginSupprime = answer.choix_login_webmail === loginOption1 ? loginOption2 : loginOption1;
      logger.info(`On conserve ${answer.choix_login_webmail}${gandi.domain} et on supprime ${loginSupprime} ...`);
      await deleteMailbox(gandi, db, logger, Sentry)(conseiller._id, answer.choix_login_webmail);
      if (`${answer.choix_login_webmail}@${gandi.domain}` !== conseiller.emailCN.address) {
        await updateEmailCN(db, gandi)(answer, conseiller, id);
      }
    }
    exit();
  }).catch(error => {
    logger.error(error);
    Sentry.captureException(error);
    exit();
  });
});
