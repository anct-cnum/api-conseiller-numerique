const creationCompteStructure = require('./structures/creationCompteStructure');
const relanceCreationCompteStructure = require('./structures/relanceCompteStructure');
const creationComptePrefet = require('./prefets/creationComptePrefet');
const creationCompteAdmin = require('./admins/creationCompteAdmin');
const bienvenueCompteStructure = require('./structures/bienvenueCompteStructure');
const bienvenueComptePrefet = require('./prefets/bienvenueComptePrefet');
const bienvenueCompteAdmin = require('./admins/bienvenueCompteAdmin');
const motDePasseOublie = require('./commun/motDePasseOublie');
const renouvellementCompte = require('./commun/renouvellementCompte');
const candidatPointRecrutement = require('./conseillers/candidatPointRecrutement');
const bienvenueCompteConseiller = require('./conseillers/bienvenueCompteConseiller');
const candidatPixEnAttente = require('./conseillers/candidatPixEnAttente');
const creationCompteConseiller = require('./conseillers/creationCompteConseiller');
const pixOrgaConseiller = require('./conseillers/pixOrgaConseiller');

module.exports = (db, mailer, app) => {

  let emails = [
    creationCompteStructure(db, mailer),
    relanceCreationCompteStructure(db, mailer),
    creationComptePrefet(db, mailer),
    creationCompteAdmin(db, mailer),
    bienvenueCompteStructure(db, mailer, app),
    bienvenueComptePrefet(db, mailer, app),
    bienvenueCompteAdmin(db, mailer, app),
    motDePasseOublie(db, mailer, app),
    renouvellementCompte(db, mailer, app),
    candidatPointRecrutement(db, mailer, app),
    bienvenueCompteConseiller(db, mailer, app),
    candidatPixEnAttente(db, mailer, app),
    creationCompteConseiller(db, mailer, app),
    pixOrgaConseiller(db, mailer, app),
  ];

  return {
    getEmailMessageByTemplateName: name => {
      return emails.find(email => email.templateName === name);
    }
  };
};
