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
const ouvertureEspaceCoopStructure = require('./structures/ouvertureEspaceCoopStructure');
const candidatConfirmeNouveauEmail = require('./confirmeChangeEmail/candidatConfirmeNouveauEmail');
const creationCompteCandidat = require('./candidats/creationCompteCandidat');
const bienvenueCompteCandidat = require('./candidats/bienvenueCompteCandidat');
const conseillerRuptureStructure = require('./structures/conseillerRuptureStructure');
const conseillersRupturePix = require('./pix/conseillersRupturePix');

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
    ouvertureEspaceCoopStructure(db, mailer, app),
    confirmeNouveauEmail(db, mailer, app),
    invitationCompteStructure(db, mailer),
    invitationAdminEspaceCoop(db, mailer),
    invitationAdminEspaceCoopBDT(db, mailer),
    candidatConfirmeNouveauEmail(db, mailer, app),
    creationCompteCandidat(db, mailer, app),
    bienvenueCompteCandidat(db, mailer, app),
    conseillerRuptureStructure(db, mailer, app),
    conseillersRupturePix(db, mailer, app)
  ];

  return {
    getEmailMessageByTemplateName: name => {
      return emails.find(email => email.templateName === name);
    }
  };
};
