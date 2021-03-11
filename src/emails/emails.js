const creationCompteStructure = require('./structures/creationCompte');
const creationComptePrefet = require('./structures/creationCompte');

module.exports = (db, mailer) => {

  let emails = [
    creationCompteStructure(db, mailer),
    creationComptePrefet(db, mailer)
  ];

  return {
    getEmailMessageByTemplateName: name => {
      return emails.find(email => email.templateName === name);
    }
  };
};
