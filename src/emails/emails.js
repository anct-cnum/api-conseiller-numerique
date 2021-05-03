const creationCompteStructure = require('./structures/creationCompteStructure');
const creationComptePrefet = require('./prefets/creationComptePrefet');
const creationCompteAdmin = require('./admins/creationCompteAdmin');
const bienvenueCompteStructure = require('./structures/bienvenueCompteStructure');
const bienvenueComptePrefet = require('./prefets/bienvenueComptePrefet');
const bienvenueCompteAdmin = require('./admins/bienvenueCompteAdmin');
const motDePasseOublie = require('./commun/MotDePasseOublie');

module.exports = (db, mailer, app) => {

  let emails = [
    creationCompteStructure(db, mailer),
    creationComptePrefet(db, mailer),
    creationCompteAdmin(db, mailer),
    bienvenueCompteStructure(db, mailer, app),
    bienvenueComptePrefet(db, mailer, app),
    bienvenueCompteAdmin(db, mailer, app),
    motDePasseOublie(db, mailer, app)
  ];

  return {
    getEmailMessageByTemplateName: name => {
      return emails.find(email => email.templateName === name);
    }
  };
};
