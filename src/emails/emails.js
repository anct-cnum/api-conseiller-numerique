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
const confirmeNouveauEmail = require('./confirmeChangeEmail/confirmeNouveauEmail');
const pixOrgaConseiller = require('./conseillers/pixOrgaConseiller');
const invitationCompteStructure = require('./structures/invitationCompteStructure');
const invitationAdminEspaceCoop = require('./structures/invitationAdminEspaceCoop');
const invitationAdminEspaceCoopBDT = require('./admins/invitationAdminEspaceCoopBDT');
const invitationStructureEspaceCoop = require('./structures/invitationStructureEspaceCoop');
const ouvertureEspaceCoopStructure = require('./structures/ouvertureEspaceCoopStructure');
const candidatConfirmeNouveauEmail = require('./confirmeChangeEmail/candidatConfirmeNouveauEmail');
const creationCompteCandidat = require('./candidats/creationCompteCandidat');
const bienvenueCompteCandidat = require('./candidats/bienvenueCompteCandidat');
const candidatSupprimePix = require('./pix/candidatSupprimePix');
const conseillerRuptureStructure = require('./structures/conseillerRuptureStructure');
const conseillersRupturePix = require('./pix/conseillersRupturePix');
const conseillerChangeEmailCnfs = require('./support/conseillerChangeEmailCnfs');
const confirmationChangeEmailCnfs = require('./support/confirmationChangeEmailCnfs');

module.exports = (db, mailer, app, logger) => {

  let emails = [
    creationCompteStructure(db, mailer),
    relanceCreationCompteStructure(db, mailer),
    creationComptePrefet(db, mailer),
    creationCompteAdmin(db, mailer),
    bienvenueCompteStructure(db, mailer),
    bienvenueComptePrefet(db, mailer),
    bienvenueCompteAdmin(db, mailer),
    motDePasseOublie(db, mailer),
    renouvellementCompte(db, mailer),
    candidatPointRecrutement(db, mailer),
    bienvenueCompteConseiller(db, mailer),
    candidatPixEnAttente(db, mailer),
    creationCompteConseiller(db, mailer),
    pixOrgaConseiller(db, mailer),
    ouvertureEspaceCoopStructure(db, mailer),
    confirmeNouveauEmail(db, mailer),
    invitationCompteStructure(db, mailer),
    invitationAdminEspaceCoop(db, mailer),
    invitationAdminEspaceCoopBDT(db, mailer),
    invitationStructureEspaceCoop(db, mailer),
    candidatConfirmeNouveauEmail(db, mailer),
    creationCompteCandidat(db, mailer),
    bienvenueCompteCandidat(db, mailer),
    candidatSupprimePix(db, mailer, app, logger),
    conseillerRuptureStructure(db, mailer),
    conseillersRupturePix(db, mailer),
    conseillerChangeEmailCnfs(db, mailer, app, logger),
    confirmationChangeEmailCnfs(db, mailer, app, logger)
  ];

  return {
    getEmailMessageByTemplateName: name => {

      return emails.find(email => email.templateName === name);
    }
  };
};
