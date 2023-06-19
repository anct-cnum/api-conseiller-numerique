const { deleteMailbox, getMailBox } = require('../../../utils/mailbox');
const { deleteAccount, searchUser } = require('../../../utils/mattermost');
const { execute } = require('../../utils');
const dayjs = require('dayjs');
const { program } = require('commander');
const { v4: uuidv4 } = require('uuid');
const { Pool } = require('pg');
const pool = new Pool();
const { ObjectID } = require('mongodb');

const configPG = {
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
  db: process.env.PGDATABASE,
  port: process.env.PGPORT,
  sslMode: process.env.PGSSLMODE,
  host: process.env.PGHOST
};

const formatDateDb = date => dayjs(date, 'YYYY-MM-DD').toDate();
const getConseiller = db => async idCNFS => await db.collection('conseillers').findOne({ _id: idCNFS });
const getStructure = db => async idStructure => await db.collection('structures').findOne({ _id: idStructure });
const updateConseillersPG = async (email, disponible) =>
  await pool.query(`
        UPDATE djapp_coach
        SET disponible = $2
        WHERE LOWER(email) = LOWER($1)`,
  [email, disponible]);
const getMisesEnRelation = db => async (idCNFS, idStructure) => await db.collection('misesEnRelation').find(
  {
    'conseiller.$id': idCNFS,
    'structure.$id': idStructure,
    'statut': { '$in': ['nouvelle_rupture', 'finalisee', 'finalisee_rupture'] }
  }
);
const updateConseiller = db => async (idCNFS, idStructure, motif, verifConseiller, dateRupture) => {
  const pushRupture = verifConseiller.ruptures === true ? {} : {
    $push: {
      ruptures: {
        structureId: idStructure,
        dateRupture: dateRupture,
        motifRupture: motif,
      },
    }
  };
  await db.collection('conseillers').updateOne({
    _id: idCNFS
  },
  {
    $set: {
      disponible: true,
      statut: 'RUPTURE',
    },
    ...pushRupture,
    $unset: {
      estRecrute: '',
      structureId: '',
      emailCNError: '',
      emailCN: '',
      emailPro: '',
      telephonePro: '',
      supHierarchique: '',
      mattermost: '',
      resetPasswordCNError: '',
      codeRegionStructure: '',
      codeDepartementStructure: '',
      hasPermanence: '',
      coordinateurs: '',
    },
  }
  );

};
const getConseillerSubordonnee = db => async idCNFS => await db.collection('conseillers').findOne({
  'listeSubordonnes.type': 'conseillers',
  'listeSubordonnes.liste': {
    $elemMatch: { $eq: idCNFS }
  },
});
const updateConseillerSubordonnee = db => async idCNFS => await db.collection('conseillers').updateMany({
  'listeSubordonnes.type': 'conseillers',
  'listeSubordonnes.liste': {
    $elemMatch: { $eq: idCNFS }
  } },
{ $pull: { 'listeSubordonnes.liste': idCNFS } },
);
const getDoublon = db => async (idCNFS, emailPerso) => await db.collection('conseillers').findOne({
  _id: { $ne: idCNFS },
  email: emailPerso,
  disponible: false
});
const updateDoublon = db => async (idCNFS, emailPerso) => {
  await db.collection('conseillers').updateMany({
    _id: { $ne: idCNFS },
    email: emailPerso,
  },
  {
    $set: {
      disponible: true,
    },
  });
  await db.collection('misesEnRelation').updateMany(
    {
      '_id': { $ne: idCNFS },
      'conseillerObj.email': emailPerso,
      'statut': 'finalisee_non_disponible',
    },
    { $set: { 'statut': 'nouvelle', 'conseillerObj.disponible': true } },
  );
};
const conseillerRecruteReinscriptionCandidat = db => async userCandidatDoublon => {
  await db.collection('users').deleteOne({ _id: userCandidatDoublon._id });
  await db.collection('conseillers').updateOne(
    { _id: userCandidatDoublon.entity.oid },
    { $set: { userCreated: false } },
  );
  await db.collection('misesEnRelation').updateMany(
    { 'conseiller.$id': userCandidatDoublon.entity.oid },
    { $set: { 'conseillerObj.userCreated': false } }
  );
};
const getUserCandidatDoublon = db => async conseiller => await db.collection('users').findOne({ roles: { $in: ['candidat'] }, name: conseiller.email });
const getCoop = db => async idCNFS => await db.collection('users').findOne({ 'roles': { $in: ['conseiller'] }, 'entity.$id': idCNFS });
const updateUserCompteCandidat = db => async (conseiller, getUserConseiller, userCandidatDoublon) => {
  // nécessaire pour ne pas avoir d'erreur de duplicate key
  const nameCandidat = getUserConseiller !== null && userCandidatDoublon === null ? { name: conseiller.email } : {};
  await db.collection('users').updateOne(
    { _id: getUserConseiller._id },
    { $set: {
      ...nameCandidat,
      roles: ['candidat'],
      token: uuidv4(),
      tokenCreatedAt: new Date(),
      mailSentDate: null, // pour le mécanisme de relance d'invitation candidat
      passwordCreated: false,
    } },
  );
};
const updateMisesEnRelationRupture = db => async (idCNFS, idStructure, dateRupture, validateur) => await db.collection('misesEnRelation').updateOne(
  {
    'conseiller.$id': idCNFS,
    'structure.$id': idStructure,
    'statut': { '$in': ['nouvelle_rupture', 'finalisee', 'finalisee_rupture'] }
  },
  {
    $set: {
      statut: 'finalisee_rupture',
      dateRupture: new Date(dateRupture),
      validateurRupture: { email: validateur, date: new Date() },
    },
    $unset: {
      dossierIncompletRupture: '',
    },
  },
);
const getMisesEnRelationNonDispo = db => async idCNFS => await db.collection('misesEnRelation').findOne(
  {
    'conseiller.$id': idCNFS,
    'statut': 'finalisee_non_disponible',
  }
);
const updateMisesEnRelationNonDispo = db => async idCNFS => await db.collection('misesEnRelation').updateMany(
  {
    'conseiller.$id': idCNFS,
    'statut': 'finalisee_non_disponible',
  },
  { $set: { statut: 'nouvelle' } },
);
const getPermanences = db => async idCNFS => await db.collection('permanences').findOne(
  {
    $or: [
      { conseillers: { $elemMatch: { $eq: idCNFS } } },
      {
        conseillersItinerants: {
          $elemMatch: { $eq: idCNFS },
        },
      },
      {
        lieuPrincipalPour: {
          $elemMatch: { $eq: idCNFS },
        },
      },
    ],
  }
);
const updatePermanences = db => async idCNFS => await db.collection('permanences').updateMany(
  {
    $or: [
      { conseillers: { $elemMatch: { $eq: idCNFS } } },
      {
        conseillersItinerants: {
          $elemMatch: { $eq: idCNFS },
        },
      },
      {
        lieuPrincipalPour: {
          $elemMatch: { $eq: idCNFS },
        },
      },
    ],
  },
  {
    $pull: {
      conseillers: idCNFS,
      lieuPrincipalPour: idCNFS,
      conseillersItinerants: idCNFS,
    },
  },
);
const gestionMailStructure = async (emails, miseEnRelation, structure) => {
  const messageStructure = emails.getEmailMessageByTemplateName('conseillerRuptureStructure');
  await messageStructure.send(miseEnRelation, structure.contact.email);
};
const gestionMailPix = async (emails, conseiller) => {
  const messagePix = emails.getEmailMessageByTemplateName('conseillersRupturePixEchec');
  await messagePix.send(conseiller);
};
const majErrorDeleteAccount = db => async idCNFS => await db.collection('conseillers').updateOne({ _id: idCNFS },
  {
    $set:
      { 'mattermost.errorDeleteAccount': true }
  });
const majDeleteMailboxCNError = db => async idCNFS => await db.collection('conseillers').updateOne({ _id: idCNFS },
  {
    $set:
      { 'emailCN.deleteMailboxCNError': true }
  });

execute(__filename, async ({ db, logger, exit, gandi, mattermost, emails, Sentry }) => {

  program.option('-c, --conseillerId <conseillerId>', 'conseillerId: id cn Mongo du conseiller');
  program.option('-s, --structure <structure>', 'structure: id structure Mongo du conseiller');
  program.option('-d, --dateFinDeContrat <dateFinDeContrat>', 'dateFinDeContrat: date rupture DD/MM/YYYY');
  program.option('-m, --motif <motif>', 'motif: motif rupture');
  program.option('-v, --validateur <validateur>', 'validateur: email validateur rupture');
  program.option('-i, --id <id>', 'id: id de la mise en relation');
  program.helpOption('-e', 'HELP command');
  program.parse(process.argv);

  const { conseillerId, structure, dateFinDeContrat, motif, validateur, id } = program;
  const regexDateRupture = new RegExp(/^([0-2][0-9]|(3)[0-1])(\/)(((0)[0-9])|((1)[0-2]))(\/)((202)[0-9])$/);
  const dateRupture = dateFinDeContrat.replace(/^(.{2})(.{1})(.{2})(.{1})(.{4})$/, '$5-$3-$1');
  const idCNFS = new ObjectID(conseillerId);
  const idStructure = new ObjectID(structure);

  if (Object.values(configPG).includes(undefined)) {
    exit(`ATTENTION : les 6 vars d'env PG n'ont pas été configurées`);
    return;
  }

  if (!conseillerId || !structure) {
    exit('Paramètres invalides. Veuillez entrer l\'id du conseiller et de la stucture');
    return;
  }
  if (!regexDateRupture.test(dateRupture)) {
    exit(`Format date rupture invalide : attendu DD/MM/YYYY`);
    return;
  }
  if (formatDateDb(dateFinDeContrat) > new Date()) {
    exit(`Anti-daté de la date saisi.. ${dateFinDeContrat}`);
    return;
  }
  try {
    // partie verification
    const conseiller = await getConseiller(db)(idCNFS);
    const structure = await getStructure(db)(idStructure);
    if (!conseiller) {
      logger.error(`Le conseiller ${idCNFS} n'existe pas`);
      return;
    }
    if (!structure) {
      logger.error(`La structure ${idCNFS} n'existe pas`);
      return;
    }
    let misesEnRelation = await getMisesEnRelation(db)(idCNFS, idStructure);
    if (!misesEnRelation) {
      logger.error(`Pas de misesEnRelation entre le conseiller et la strcuture !`);
      return;
    }
    if (misesEnRelation.length >= 2 && !id) { // Dans le cas si une SA recrute le meme CN, pour ciblé la bonne mise en relation
      logger.error(`Il y a 2 misesEnrelation, veuillez indiquer l'id de la mise en relation.`);
      return;
    }
    misesEnRelation = misesEnRelation.find(i => String(i._id) === id);
    if (!misesEnRelation) {
      logger.error(`L'id saisi ne correspond à aucune mise en relation`);
      return;
    }
    // Partie Doc conseiller
    if (conseiller?.disponible === false) {
      logger.info(`Correction disponible false à true`);
      await updateConseillersPG(pool)(conseiller.email, true);
    }
    const verifConseiller = { // verif si tout à était effectuer true==Ok / false==NotOK
      statut: conseiller?.statut === 'RUPTURE',
      ruptures: !(!conseiller?.rupture.find(i => i.structureId === idStructure && i.dateRupture === new Date(dateRupture))),
      estRecrute: conseiller?.estRecrute === null,
      structureId: conseiller?.structureId === null,
      emailCNError: conseiller?.emailCNError === null,
      emailCN: conseiller?.emailCN?.deleteMailboxCNError === false,
      emailPro: conseiller?.emailPro === null,
      telephonePro: conseiller?.telephonePro === null,
      supHierarchique: conseiller?.supHierarchique === null,
      mattermost: conseiller?.mattermost?.errorDeleteAccount === false,
      resetPasswordCNError: conseiller?.resetPasswordCNError === null,
      codeRegionStructure: conseiller?.codeRegionStructure === null,
      codeDepartementStructure: conseiller?.codeDepartementStructure === null,
      hasPermanence: conseiller?.hasPermanence === null,
      coordinateurs: conseiller?.coordinateurs === null,
    };
    if (Object.values(verifConseiller).includes(false)) {
      logger.info(`Correction des tags : ${Object.keys(verifConseiller.filter(i => i === true))}`);
      await updateConseiller(db)(idCNFS, idStructure, motif, verifConseiller, dateRupture);
    }
    const conseillerSubordonnee = await getConseillerSubordonnee(db)(idCNFS);
    if (conseillerSubordonnee) {
      logger.info(`Correction $pull subordonnee`);
      await updateConseillerSubordonnee(db)(idCNFS);
    }
    const doublon = await getDoublon(db)(idCNFS, conseiller?.email);
    if (doublon) {
      logger.info(`Correction Doublon disponible false à true`);
      await updateDoublon(db)(idCNFS, conseiller?.email); // doc conseiller et misesEnRelation !
    }
    // Partie users
    // Cas spécifique : conseiller recruté s'est réinscrit sur le formulaire d'inscription => compte coop + compte candidat
    const userCandidatDoublon = await getUserCandidatDoublon(db)(conseiller);
    if (userCandidatDoublon !== null) {
      logger.info(`Correction candidat users en doublon`);
      await conseillerRecruteReinscriptionCandidat(db)(userCandidatDoublon);
    }
    const getUserConseiller = await getCoop(db)(idCNFS);
    if (!['candidat'].includes(getUserConseiller?.roles) && getUserConseiller?.name !== conseiller?.email) {
      logger.info(`Correction compte conseiller en candidat`);
      await updateUserCompteCandidat(db)(conseiller, getUserConseiller, userCandidatDoublon);
    }
    // Partie misesEnRelation
    const verifMisesEnRelation = {
      statut: misesEnRelation?.misesEnRelation === 'finalisee_rupture',
      dateRupture: misesEnRelation?.dateRupture ? (formatDateDb(misesEnRelation.dateRupture) > new Date()) : false,
      validateurRupture: !(!misesEnRelation?.validateurRupture),
    };
    if (Object.values(verifMisesEnRelation).includes(false)) {
      logger.info(`Correction rupture dans la mise en relation`);
      await updateMisesEnRelationRupture(db)(idCNFS, idStructure, dateRupture, validateur);
    }
    const visibleSA = await getMisesEnRelationNonDispo(db)(idCNFS);
    if (visibleSA) {
      logger.info(`Correction mise en relation visible par les structures`);
      await updateMisesEnRelationNonDispo(db)(idCNFS);
    }
    // Partie Permanence
    const permanences = await getPermanences(db)(idCNFS);
    if (permanences) {
      logger.info(`Correction pour les permanences`);
      await updatePermanences(db)(idCNFS);
    }
    // Partie MAIL PIX & SA
    const login = conseiller?.emailCN?.address?.substring(0, conseiller?.emailCN?.address?.lastIndexOf('@')) ?? `${conseiller.prenom}.${conseiller.nom}`;
    if (!misesEnRelation?.mailCnfsRuptureSentDate) {
      logger.info(`Correction sur l'envoi d'email structure et Pix Orga`);
      await gestionMailStructure(emails, misesEnRelation, structure);
      await gestionMailPix(emails, conseiller);
    }
    // Partie gandi
    const getWebmail = await getMailBox({ gandi, login }); // A tester comment ça renvoi
    if (getWebmail) {
      logger.info(`Correction webmail gandi (gandi)`);
      await deleteMailbox(gandi, db, logger, Sentry)(conseiller._id, login);
    }
    if (conseiller?.emailCN?.deleteMailboxCNError === true) { // garder car si ça passe en erreur et que au final réellement supprimer
      logger.info(`Correction webmail gandi (doc conseiller)`);
      await majDeleteMailboxCNError(db)(idCNFS);
    }
    // Partie Mattermost
    const getAccountMattermost = await searchUser(mattermost, null, conseiller); // idem A tester
    if (!getAccountMattermost) {
      logger.info(`Correction mattermost (MM)`);
      await deleteAccount(mattermost, conseiller, db, logger, Sentry);
    }
    if (conseiller?.mattermost?.errorDeleteAccount === true) {
      logger.info(`Correction mattermost (doc conseiller)`);
      await majErrorDeleteAccount(db)(idCNFS);
    }
  } catch (error) {
    logger.error(error);
    Sentry.captureException(error);
  }
  logger.info(`Correction Rupture du conseiller ${idCNFS} OK !`);
  exit();
});
