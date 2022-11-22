const { program } = require('commander');
const { execute } = require('../../utils');
const { DBRef, ObjectID } = require('mongodb');
const utils = require('../../../utils/index');
const dayjs = require('dayjs');

require('dotenv').config();

const formatDate = date => dayjs(date.replace(/^(.{2})(.{1})(.{2})(.{1})(.{4})$/, '$5-$3-$1'), 'YYYY-MM-DD').toDate();

const majMiseEnRelationStructureRupture = db => async (idCNFS, nouvelleSA, ancienneSA, dateRupture, motifRupture) => {
  await db.collection('misesEnRelation').updateOne(
    { 'conseiller.$id': idCNFS,
      'structure.$id': ancienneSA,
      'statut': { $in: ['finalisee', 'nouvelle_rupture'] }
    },
    {
      $set: {
        statut: 'finalisee_rupture',
        dateRupture,
        motifRupture,
        transfert: {
          'destinationStructureId': nouvelleSA,
          'date': new Date()
        }
      }
    }
  );
};
const historiseCollectionRupture = db => async (idCNFS, ancienneSA, dateRupture, motifRupture) => {
  await db.collection('conseillersRuptures').insertOne({
    conseillerId: idCNFS,
    structureId: ancienneSA,
    dateRupture,
    motifRupture
  });
};
const majMiseEnRelationStructureNouvelle = (db, app) => async (idCNFS, nouvelleSA, dateEmbauche, structureDestination) => {
  const misesEnrelationNouvelleSA = await db.collection('misesEnRelation').findOne({ 'conseiller.$id': idCNFS, 'structure.$id': nouvelleSA });
  if (!misesEnrelationNouvelleSA) {
    const connection = app.get('mongodb');
    const database = connection.substr(connection.lastIndexOf('/') + 1);
    await db.collection('misesEnRelation').insertOne({
      conseiller: new DBRef('conseillers', idCNFS, database),
      structure: new DBRef('structures', nouvelleSA, database),
      statut: 'finalisee',
      createdAt: new Date(),
      conseillerObj: {},
      structureObj: structureDestination,
      dateRecrutement: dateEmbauche
    });
  } else {
    await db.collection('misesEnRelation').updateOne(
      { 'conseiller.$id': idCNFS, 'structure.$id': nouvelleSA },
      { $set: { statut: 'finalisee', dateRecrutement: dateEmbauche }
      });
  }
};
const majDataCnfsStructureNouvelle = db => async (idCNFS, nouvelleSA, dateEmbauche, ancienneSA, dateRupture, motifRupture, structureDestination) => {
  await db.collection('conseillers').updateOne({ _id: idCNFS }, {
    $set: {
      structureId: nouvelleSA,
      datePrisePoste: dateEmbauche,
      codeRegionStructure: structureDestination.codeRegion,
      codeDepartementStructure: structureDestination.codeDepartement,
      hasPermanence: false,
    },
    $push: { ruptures: {
      structureId: ancienneSA,
      dateRupture,
      motifRupture
    } }
  });
};
const majConseillerObj = db => async idCNFS => {
  const conseillerAjour = await db.collection('conseillers').findOne({ _id: idCNFS });
  await db.collection('misesEnRelation').updateMany({ 'conseiller.$id': idCNFS }, { $set: { 'conseillerObj': conseillerAjour } });
};
const craCoherenceDateEmbauche = db => async (idCNFS, nouvelleSA, dateEmbauche) => await db.collection('cras').updateMany(
  { 'conseiller.$id': idCNFS,
    'cra.dateAccompagnement': { '$gte': dateEmbauche }
  }, {
    $set: { 'structure.$id': nouvelleSA }
  });
const updatePermanences = db => async idCNFS => await db.collection('permanences').updateMany(
  {
    $or: [
      { 'conseillers': { $elemMatch: { $eq: idCNFS } } },
      { 'conseillersItinerants': { $elemMatch: { $eq: idCNFS } } },
      { 'lieuPrincipalPour': { $elemMatch: { $eq: idCNFS } } }
    ]
  },
  { $pull: { conseillers: idCNFS, conseillersItinerants: idCNFS, lieuPrincipalPour: idCNFS } }
);

const emailsStructureAncienne = db => async (emails, cnfsRecrute, ancienneSA) => {
  const structure = await db.collection('structures').findOne({ _id: ancienneSA });
  const messageStructure = emails.getEmailMessageByTemplateName('conseillerRuptureStructure');
  await messageStructure.send(cnfsRecrute, structure.contact.email);
};

const emailsCnfsNotification = db => async (emails, idCNFS) => {
  const conseiller = await db.collection('conseillers').findOne({ _id: idCNFS });
  const messageConseillerTransfert = emails.getEmailMessageByTemplateName('conseillerTransfertStructure');
  await messageConseillerTransfert.send(conseiller.emailCN.address);
};

execute(__filename, async ({ db, logger, exit, app, emails, Sentry }) => {

  program.option('-i, --id <id>', 'id: id Mongo du conseiller à transférer');
  program.option('-a, --ancienne <ancienne>', 'ancienne: id mongo structure qui deviendra ancienne structure du conseiller');
  program.option('-r, --rupture <rupture>', 'rupture: date de rupture AAAA/MM/DD');
  program.option('-m, --motif <motif>', 'motif: motif de la rupture');
  program.option('-n, --nouvelle <nouvelle>', 'nouvelle: id mongo structure de destination');
  program.option('-e, --embauche <embauche>', 'embauche: date de embauche AAAA/MM/DD');
  program.option('-c, --cota', 'cota: pour desactivé la verif du nombre de post autorisé');
  program.helpOption('-e', 'HELP command');
  program.parse(process.argv);

  const { id, ancienne, nouvelle, rupture, embauche, motif, cota } = program;
  if (!id || !ancienne || !nouvelle || !rupture || !embauche || !motif) {
    exit('Paramètres invalides. Veuillez entrez les 6 paramètres requis');
    return;
  }
  const idCNFS = new ObjectID(id);
  const ancienneSA = new ObjectID(ancienne);
  const nouvelleSA = new ObjectID(nouvelle);
  const dateRupture = formatDate(rupture);
  const dateEmbauche = formatDate(embauche);
  const motifRupture = motif;

  const cnfsRecrute = await db.collection('misesEnRelation').findOne(
    { 'conseiller.$id': idCNFS, 'structure.$id': ancienneSA,
      'statut': { $in: ['finalisee', 'nouvelle_rupture'] }
    });
  if (!cnfsRecrute) {
    exit(`Le Cnfs avec l'id ${idCNFS} n'est pas recruté.`);
    return;
  }
  const structureDestination = await db.collection('structures').findOne({ '_id': nouvelleSA });
  if (structureDestination?.statut !== 'VALIDATION_COSELEC') {
    exit(`La structure destinataire n'est pas 'VALIDATION_COSELEC' mais ${structureDestination.statut}`);
    return;
  }
  let dernierCoselec = utils.getCoselec(structureDestination);
  const misesEnRelationRecrutees = await db.collection('misesEnRelation').countDocuments({
    'statut': { $in: ['recrutee', 'finalisee'] },
    'structure.$id': structureDestination._id
  });
  if (misesEnRelationRecrutees >= dernierCoselec.nombreConseillersCoselec && !cota) {
    //eslint-disable-next-line max-len
    exit(`La structure destinataire est seulement autorisé à avoir ${dernierCoselec.nombreConseillersCoselec} conseillers et en a déjà ${misesEnRelationRecrutees} validé(s)/recruté(s)`);
    return;
  }
  try {
    await majMiseEnRelationStructureRupture(db)(idCNFS, nouvelleSA, ancienneSA, dateRupture, motifRupture);
    await historiseCollectionRupture(db)(idCNFS, ancienneSA, dateRupture, motifRupture);
    await majMiseEnRelationStructureNouvelle(db, app)(idCNFS, nouvelleSA, dateEmbauche, structureDestination);
    await majDataCnfsStructureNouvelle(db)(idCNFS, nouvelleSA, dateEmbauche, ancienneSA, dateRupture, motifRupture, structureDestination);
    await majConseillerObj(db)(idCNFS);
    await craCoherenceDateEmbauche(db)(idCNFS, nouvelleSA, dateEmbauche);
    await updatePermanences(db)(idCNFS);
    await emailsStructureAncienne(db)(emails, cnfsRecrute, ancienneSA);
    await emailsCnfsNotification(db)(emails, idCNFS);
  } catch (error) {
    logger.error(error.message);
    Sentry.captureException(error);
  }

  logger.info(`Le conseiller id: ${idCNFS} a été transféré de la structure: ${ancienneSA} vers la structure: ${nouvelleSA} (${structureDestination.nom})`);
  exit();
});
