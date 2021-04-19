const creationCompteStructure = require('./structures/creationCompteStructure');
const creationComptePrefet = require('./prefets/creationComptePrefet');
const creationCompteAdmin = require('./admins/creationCompteAdmin');

module.exports = (db, mailer) => {

  let emails = [
    creationCompteStructure(db, mailer),
    creationComptePrefet(db, mailer),
    creationCompteAdmin(db, mailer)
  ];

  return {
    getEmailMessageByTemplateName: name => {
      return emails.find(email => email.templateName === name);
    }
  };
};
