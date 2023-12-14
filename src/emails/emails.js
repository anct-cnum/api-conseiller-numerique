const creationCompteStructure = require('./structures/creationCompteStructure');
const relanceCreationCompteStructure = require('./structures/relanceCompteStructure');
const creationComptePrefet = require('./prefets/creationComptePrefet');
const creationCompteAdmin = require('./admins/creationCompteAdmin');
const bienvenueCompteStructure = require('./structures/bienvenueCompteStructure');
const bienvenueComptePrefet = require('./prefets/bienvenueComptePrefet');
const bienvenueCompteAdmin = require('./admins/bienvenueCompteAdmin');
const motDePasseOublie = require('./commun/motDePasseOublie');
const resetMotDePasseCnil = require('./commun/resetMotDePasseCnil');
const renouvellementCompte = require('./commun/renouvellementCompte');
const candidatPointRecrutement = require('./conseillers/candidatPointRecrutement');
const bienvenueCompteConseiller = require('./conseillers/bienvenueCompteConseiller');
const bienvenueCompteCoordinateur = require('./conseillers/bienvenueCompteCoordinateur');
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
const conseillerConfirmeNouveauEmail = require('./confirmeChangeEmail/conseillerConfirmeNouveauEmail');
const conseillerConfirmeNouveauEmailPro = require('./confirmeChangeEmail/conseillerConfirmeNouveauEmailPro');
const creationCompteCandidat = require('./candidats/creationCompteCandidat');
const bienvenueCompteCandidat = require('./candidats/bienvenueCompteCandidat');
const candidatSupprimePix = require('./pix/candidatSupprimePix');
const conseillerRuptureStructure = require('./structures/conseillerRuptureStructure');
const conseillersRupturePix = require('./pix/conseillersRupturePix');
const conseillersRupturePixEchec = require('./pix/conseillersRupturePixEchec');
const conseillerChangeEmailCnfs = require('./support/conseillerChangeEmailCnfs');
const confirmationChangeEmailCnfs = require('./support/confirmationChangeEmailCnfs');
const invitationHubEspaceCoop = require('./hubs/creationCompteHub');
const bienvenueCompteHub = require('./hubs/bienvenueCompteHub');
const mailRelanceM1Conseiller = require('./conseillers/mailRelanceM+1Conseiller');
const mailRelanceM1Structure = require('./structures/mailRelanceM+1Structure');
const mailRelanceM1SupHierarchique = require('./structures/mailRelanceM+1SupHierarchique');
const mailRelanceM15Conseiller = require('./conseillers/mailRelanceM+1,5Conseiller');
const mailRelanceM15Structure = require('./structures/mailRelanceM+1,5Structure');
const mailRelanceM15SupHierarchique = require('./structures/mailRelanceM+1,5SupHierarchique');
const conseillerTransfertStructure = require('./conseillers/conseillerTransfertStructure');
const renouvellementCompteCandidat = require('./candidats/renouvellementCompteCandidat');

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
    resetMotDePasseCnil(db, mailer),
    renouvellementCompte(db, mailer),
    renouvellementCompteCandidat(db, mailer),
    candidatPointRecrutement(db, mailer),
    bienvenueCompteConseiller(db, mailer),
    bienvenueCompteCoordinateur(db, mailer),
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
    conseillerConfirmeNouveauEmail(db, mailer),
    conseillerConfirmeNouveauEmailPro(db, mailer),
    creationCompteCandidat(db, mailer),
    bienvenueCompteCandidat(db, mailer),
    candidatSupprimePix(db, mailer, app, logger),
    conseillerRuptureStructure(db, mailer),
    conseillersRupturePix(db, mailer),
    conseillersRupturePixEchec(db, mailer),
    conseillerChangeEmailCnfs(db, mailer, app, logger),
    confirmationChangeEmailCnfs(db, mailer, app, logger),
    invitationHubEspaceCoop(db, mailer),
    bienvenueCompteHub(db, mailer),
    mailRelanceM1Conseiller(db, mailer),
    mailRelanceM1Structure(db, mailer),
    mailRelanceM1SupHierarchique(db, mailer),
    mailRelanceM15Conseiller(db, mailer),
    mailRelanceM15Structure(db, mailer),
    mailRelanceM15SupHierarchique(db, mailer),
    conseillerTransfertStructure(db, mailer),
  ];

  return {
    getEmailMessageByTemplateName: name => {

      return emails.find(email => email.templateName === name);
    }
  };
};
