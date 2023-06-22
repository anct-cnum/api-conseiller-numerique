const { deleteMailbox, getMailBox, fixHomonymesCreateMailbox } = require('../../../utils/mailbox');
const { deleteAccountRuptureEchec, searchUser } = require('../../../utils/mattermost');
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
const updateConseillersPG = pool => async (email, disponible) =>
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
).toArray();
const updateConseiller = db => async (idCNFS, idStructure, verifConseiller, dateRupture, motif) => {
  const pushRupture = verifConseiller.ruptures === true ? {} : {
    $push: {
      ruptures: {
        structureId: idStructure,
        dateRupture: formatDateDb(dateRupture),
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
      listeSubordonnes: '',
      estCoordinateur: ''
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
const conseillerRecruteReinscriptionCandidat = db => async userCandidatDoublon => {
  await db.collection('users').deleteOne({ _id: userCandidatDoublon._id });
  await db.collection('conseillers').updateOne(
    { _id: userCandidatDoublon.entity.oid },
    { $set: { userCreated: false } },
  );
};
const getUserCandidatDoublon = db => async (conseiller, idCNFS) =>
  await db.collection('users').findOne({ 'entity.$id': { $ne: idCNFS }, 'roles': { $in: ['candidat'] }, 'name': conseiller.email });
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
const updateMisesEnRelationRupture = db => async (misesEnRelation, idCNFS, idStructure, dateRupture, validateur, motif) =>
  await db.collection('misesEnRelation').updateOne(
    {
      '_id': misesEnRelation._id,
      'conseiller.$id': idCNFS,
      'structure.$id': idStructure
    },
    {
      $set: {
        statut: 'finalisee_rupture',
        dateRupture: new Date(dateRupture),
        validateurRupture: { email: validateur, date: new Date() },
        motifRupture: motif
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
const getHistorisationRupture = db => async (idCNFS, idStructure, dateRupture) => await db.collection('conseillersRuptures').findOne({
  conseillerId: idCNFS,
  structureId: idStructure,
  dateRupture: { $gte: formatDateDb(dateRupture), $lte: formatDateDb(dateRupture) }
});
const updateHistorisationRupture = db => async (idCNFS, idStructure, dateRupture, motifRupture) =>
  await db.collection('conseillersRuptures').insertOne({
    conseillerId: idCNFS,
    structureId: idStructure,
    dateRupture: formatDateDb(dateRupture),
    motifRupture
  });
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
const gestionMailPix = async (emails, conseiller, login, gandi) => {
  let infoMailPixRupture = { ...conseiller, emailCN: { address: login + '@' + gandi.domain } };
  const messagePix = emails.getEmailMessageByTemplateName('conseillersRupturePixEchec');
  await messagePix.send(infoMailPixRupture);
};
const majErrorDeleteAccountMM = db => async idCNFS => await db.collection('conseillers').updateOne({ _id: idCNFS },
  {
    $set:
      { 'mattermost.errorDeleteAccount': false }
  });
const majDeleteMailboxCNError = db => async idCNFS => await db.collection('conseillers').updateOne({ _id: idCNFS },
  {
    $set:
      { 'emailCN.deleteMailboxCNError': false }
  });

execute(__filename, async ({ db, logger, exit, gandi, mattermost, emails, Sentry }) => {
  program.option('-c, --conseillerId <conseillerId>', 'conseillerId: id cn Mongo du conseiller');
  program.option('-s, --structureId <structureId>', 'structureId: id structureId Mongo du conseiller');
  program.option('-d, --dateFinDeContrat <dateFinDeContrat>', 'dateFinDeContrat: date rupture DD/MM/YYYY');
  program.option('-m, --motif <motif>', 'motif: motif rupture');
  program.option('-v, --validateur <validateur>', 'validateur: email validateur rupture');
  program.option('-i, --id <id>', 'id: id de la mise en relation');
  program.option('-u, --user <user>', 'user: prenom.nom dans le cas d\'un homonyme');
  program.helpOption('-e', 'HELP command');
  program.parse(process.argv);

  const { conseillerId, structureId, dateFinDeContrat, motif, validateur, id, user } = program;
  const regexDateRupture = new RegExp(/^([0-2][0-9]|(3)[0-1])(\/)(((0)[0-9])|((1)[0-2]))(\/)((202)[0-9])$/);
  const dateRupture = dateFinDeContrat?.replace(/^(.{2})(.{1})(.{2})(.{1})(.{4})$/, '$5-$3-$1');
  const idCNFS = new ObjectID(conseillerId);
  const idStructure = new ObjectID(structureId);

  if (Object.values(configPG).includes(undefined)) {
    exit(`ATTENTION : les 6 vars d'env PG n'ont pas été configurées`);
    return;
  }
  if (!conseillerId || !structureId || !validateur || !motif) {
    exit('Paramètres invalides. Veuillez entrer l\'id du conseiller / id stucture/ email validateur / le motif');
    return;
  }
  if (!regexDateRupture.test(dateFinDeContrat)) {
    exit(`Format date rupture invalide : attendu DD/MM/YYYY`);
    return;
  }
  if (formatDateDb(dateRupture) > new Date()) {
    exit(`Anti-daté de la date saisi.. ${dateRupture}`);
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
    const misesEnRelationCnAndSa = await getMisesEnRelation(db)(idCNFS, idStructure);
    let misesEnRelation = misesEnRelationCnAndSa[0];
    if (!misesEnRelationCnAndSa[0]) {
      logger.error(`Pas de mise en relation entre le conseiller et la structure !`);
      return;
    }
    if (misesEnRelationCnAndSa.length >= 2) { // Dans le cas si une SA recrute le même CN, pour cibler la bonne mise en relation
      if (!id) {
        logger.error(`Il y a 2 misesEnrelation, veuillez indiquer l'id de la mise en relation.`);
        return;
      }
      misesEnRelation = misesEnRelationCnAndSa.find(i => String(i._id) === id);
      if (!misesEnRelation) {
        logger.error(`L'id saisi ne correspond à aucune mise en relation`);
        return;
      }
    }
    // Partie Doc conseiller & doublon
    const doublon = await getDoublon(db)(idCNFS, conseiller?.email);
    if (conseiller?.disponible === false || doublon) { // gestion du disponible doc CN => update PG => maj via la synchro doc CN
      if (conseiller?.disponible === false) {
        logger.info(`Correction disponible false à true`);
      }
      if (doublon) {
        logger.info(`Correction Doublon disponible false à true`);
      }
      await updateConseillersPG(pool)(conseiller.email, true);
    }
    const verifConseiller = { // verif si tout a été effectué true==Ok / false==NotOK
      statut: conseiller?.statut === 'RUPTURE',
      ruptures: conseiller?.ruptures.filter(i => String(i.structureId) === structureId)?.length === misesEnRelationCnAndSa.length,
      estRecrute: !conseiller?.estRecrute,
      structureId: !conseiller?.structureId,
      emailCNError: !conseiller?.emailCNError,
      emailCN: conseiller?.emailCN?.deleteMailboxCNError === false || !conseiller?.emailCN,
      emailPro: !conseiller?.emailPro,
      telephonePro: !conseiller?.telephonePro,
      supHierarchique: !conseiller?.supHierarchique,
      mattermost: conseiller?.mattermost?.errorDeleteAccount === false || !conseiller?.mattermost,
      resetPasswordCNError: !conseiller?.resetPasswordCNError,
      codeRegionStructure: !conseiller?.codeRegionStructure,
      codeDepartementStructure: !conseiller?.codeDepartementStructure,
      hasPermanence: !conseiller?.hasPermanence,
      coordinateurs: !conseiller?.coordinateurs,
    };
    if (Object.values(verifConseiller).includes(false)) {
      const arrayLog = [];
      for (const [key, value] of Object.entries(verifConseiller)) {
        if (value === false) {
          arrayLog.push(key);
        }
      }
      logger.info(`Correction des tags : ${arrayLog}`);
      await updateConseiller(db)(idCNFS, idStructure, verifConseiller, dateRupture, motif);
    }
    const conseillerSubordonnee = await getConseillerSubordonnee(db)(idCNFS);
    if (conseillerSubordonnee) {
      logger.info(`Correction $pull subordonnee`);
      await updateConseillerSubordonnee(db)(idCNFS);
    }
    // Partie users
    // Cas spécifique : conseiller recruté s'est réinscrit sur le formulaire d'inscription => compte coop + compte candidat
    const userCandidatDoublon = await getUserCandidatDoublon(db)(conseiller, idCNFS);
    if (userCandidatDoublon) {
      logger.info(`Correction candidat users en doublon`);
      await conseillerRecruteReinscriptionCandidat(db)(userCandidatDoublon);
    }
    const getUserConseiller = await getCoop(db)(idCNFS);
    if (getUserConseiller && !['candidat'].includes(getUserConseiller?.roles) && getUserConseiller?.name !== conseiller?.email) {
      logger.info(`Correction compte conseiller en candidat`);
      await updateUserCompteCandidat(db)(conseiller, getUserConseiller, userCandidatDoublon);
    }
    // Partie misesEnRelation
    const verifMisesEnRelation = {
      statut: misesEnRelation?.statut === 'finalisee_rupture',
      dateRupture: !(!misesEnRelation?.dateRupture),
      validateurRupture: !(!misesEnRelation?.validateurRupture),
      motifRupture: !(!misesEnRelation?.motifRupture)
    };
    if (Object.values(verifMisesEnRelation).includes(false)) {
      logger.info(`Correction rupture dans la mise en relation`);
      await updateMisesEnRelationRupture(db)(misesEnRelation, idCNFS, idStructure, dateRupture, validateur, motif);
    }
    const visibleSA = await getMisesEnRelationNonDispo(db)(idCNFS);
    if (visibleSA) {
      logger.info(`Correction mise en relation visible par les structures`);
      await updateMisesEnRelationNonDispo(db)(idCNFS);
    }
    // Partie historisation conseillersRuptures
    const getHistorisation = await getHistorisationRupture(db)(idCNFS, idStructure, dateRupture);
    if (!getHistorisation) {
      logger.info(`Correction historisation de la rupture`);
      await updateHistorisationRupture(db)(idCNFS, idStructure, dateRupture, motif);
    }
    // Partie Permanence
    const permanences = await getPermanences(db)(idCNFS);
    if (permanences) {
      logger.info(`Correction pour les permanences`);
      await updatePermanences(db)(idCNFS);
    }
    // Partie verif Homonyme
    let login = conseiller?.emailCN?.address?.substring(0, conseiller?.emailCN?.address?.lastIndexOf('@')) ?? `non renseignée`;
    if (login === 'non renseigné') {
      const verifHomonyme = await fixHomonymesCreateMailbox(gandi, conseiller.nom, conseiller.prenom, db);
      if (verifHomonyme !== login) {
        exit(`Homonyme détecté, veuillez saisir le prenom.nom`);
        return;
      }
      login = user ?? `${conseiller.prenom}.${conseiller.nom}`;
    }
    // Partie MAIL PIX & SA
    if (!misesEnRelation?.mailCnfsRuptureSentDate) {
      logger.info(`Correction sur l'envoi d'email structure et Pix Orga`);
      await gestionMailPix(emails, conseiller, login, gandi);
      // await gestionMailStructure(emails, misesEnRelation, structure); // Commenter temporairement pour les 3 cas.
    }
    // Partie gandi
    const getWebmail = await getMailBox({ gandi, login });
    if (getWebmail.data.filter(i => i.login === login)?.length === 1) {
      logger.info(`Correction webmail gandi (gandi)`);
      await deleteMailbox(gandi, db, logger, Sentry)(conseiller._id, login);
    }
    if (conseiller?.emailCN?.deleteMailboxCNError !== false && !getWebmail[0]) { // garder car si ça passe en erreur et que au final réellement supprimer
      logger.info(`Correction webmail gandi (doc conseiller)`);
      await majDeleteMailboxCNError(db)(idCNFS);
    }
    // Partie Mattermost
    const getAccountMattermost = await searchUser(mattermost, null, conseiller);
    const resultMattermost = getAccountMattermost.data.filter(i => i.email === `eliott.pesnel@${gandi.domain}`);
    if (resultMattermost?.length === 1) {
      logger.info(`Correction mattermost (MM)`);
      await deleteAccountRuptureEchec(resultMattermost[0]?.id, mattermost, conseiller, db, logger, Sentry);
    }
    if (conseiller?.mattermost?.errorDeleteAccount !== false && !getAccountMattermost[0]) {
      logger.info(`Correction mattermost (doc conseiller)`);
      await majErrorDeleteAccountMM(db)(idCNFS);
    }
  } catch (error) {
    logger.error(error);
    Sentry.captureException(error);
  }
  logger.info(`Rupture en vrac du conseiller ${idCNFS} OK !`);
  exit();
});
