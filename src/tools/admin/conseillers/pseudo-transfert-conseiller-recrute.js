const { program } = require('commander');
const { execute } = require('../../utils');
const { DBRef, ObjectID } = require('mongodb');
const utils = require('../../../utils/index');
const dayjs = require('dayjs');
require('dotenv').config();

execute(__filename, async ({ db, logger, exit, app }) => {
  const formatDate = date => dayjs(date.replace(/^(.{2})(.{1})(.{2})(.{1})(.{4})$/, '$5-$3-$1'), 'YYYY-MM-DD').toDate();

  program.option('-i, --id <id>', 'id: id Mongo du conseiller à transférer');
  program.option('-a, --ancienne <ancienne>', 'ancienne: id mongo structure qui deviendra ancienne structure du conseiller');
  program.option('-n, --nouvelle <nouvelle>', 'nouvelle: structure de destination');
  program.option('-d, --date <date>', 'date: date de recrutement');
  program.option('-q, --quota', 'quota: pour désactiver le bridage du nombre de poste validé en Coselec');
  program.helpOption('-e', 'HELP command');
  program.parse(process.argv);

  let idCNFS = program.id;
  let ancienneSA = program.ancienne;
  let nouvelleSA = program.nouvelle;
  let dateEmbauche = program.date;
  const quota = program.quota;

  if (!idCNFS || !ancienneSA || !nouvelleSA || !dateEmbauche) {
    exit('Paramètres invalides. Veuillez préciser un id du conseiller ainsi qu\'un id de la structure actuelle; un id de la structure destinataire et la date');
    return;
  }

  idCNFS = new ObjectID(program.id);
  ancienneSA = new ObjectID(program.ancienne);
  nouvelleSA = new ObjectID(program.nouvelle);
  dateEmbauche = formatDate(dateEmbauche);

  const cnfsRecrute = await db.collection('misesEnRelation').findOne({ 'conseiller.$id': idCNFS, 'structure.$id': ancienneSA, 'statut': 'finalisee' });
  if (!cnfsRecrute) {
    exit(`Le Cnfs avec l'id ${idCNFS} n'est pas recruté.`);
    return;
  }
  const structureDestination = await db.collection('structures').findOne({ '_id': nouvelleSA });

  if (structureDestination?.statut !== 'VALIDATION_COSELEC' && !quota) {
    exit(`La structure destinataire n'est pas 'VALIDATION_COSELEC' mais ${structureDestination.statut}`);
    return;
  }
  let dernierCoselec = utils.getCoselec(structureDestination);
  const misesEnRelationRecrutees = await db.collection('misesEnRelation').countDocuments({
    'statut': { $in: ['recrutee', 'finalisee'] },
    'structure.$id': structureDestination._id
  });
  if (misesEnRelationRecrutees >= dernierCoselec.nombreConseillersCoselec) {
    //eslint-disable-next-line max-len
    exit(`La structure destinataire est seulement autorisé  à avoir ${dernierCoselec.nombreConseillersCoselec} conseillers et en a déjà ${misesEnRelationRecrutees} validé(s)/recrutée(s)`);
    return;
  }

  await db.collection('conseillers').updateOne({ _id: idCNFS }, { $set: { structureId: nouvelleSA } });
  await db.collection('misesEnRelation').updateMany({ 'conseiller.$id': idCNFS }, { $set: { 'conseillerObj.structureId': nouvelleSA } });

  await db.collection('misesEnRelation').updateOne(
    { 'conseiller.$id': idCNFS, 'structure.$id': ancienneSA },
    { $set: {
      statut: 'finalisee_non_disponible',
      transfert: {
        'destinationStructureId': nouvelleSA,
        'date': new Date()
      }
    }
    });

  const misesEnrelationNouvelleSA = await db.collection('misesEnRelation').findOne({ 'conseiller.$id': idCNFS, 'structure.$id': nouvelleSA });
  const transfert = {
    'ancienneStructureId': ancienneSA,
    'date': new Date()
  };

  if (!misesEnrelationNouvelleSA) {
    const connection = app.get('mongodb');
    const database = connection.substr(connection.lastIndexOf('/') + 1);
    const conseiller = await db.collection('conseillers').findOne({ _id: idCNFS });
    const structure = await db.collection('structures').findOne({ _id: nouvelleSA });

    await db.collection('misesEnRelation').insertOne({
      conseiller: new DBRef('conseillers', idCNFS, database),
      structure: new DBRef('structures', nouvelleSA, database),
      statut: 'finalisee',
      createdAt: new Date(),
      conseillerObj: conseiller,
      structureObj: structure,
      dateRecrutement: dateEmbauche,
      transfert
    });
  } else {
    await db.collection('misesEnRelation').updateOne(
      { 'conseiller.$id': idCNFS, 'structure.$id': nouvelleSA },
      { $set: {
        statut: 'finalisee',
        transfert
      }
      });
  }
  await db.collection('cras').updateMany(
    { 'conseiller.$id': idCNFS,
      'cra.dateAccompagnement': { '$gte': dateEmbauche }
    }, {
      $set: { 'structure.$id': nouvelleSA }
    });

  logger.info(`Le conseiller id: ${idCNFS} a été transféré de la structure: ${ancienneSA} vers la structure: ${nouvelleSA}`);
  exit();
});
