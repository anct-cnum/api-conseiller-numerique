const { program } = require('commander');
const { execute } = require('../../utils');
const { DBRef, ObjectID } = require('mongodb');
const utils = require('../../../utils/index');
require('dotenv').config();

execute(__filename, async ({ db, logger, exit, app }) => {

  program.option('-i, --id <id>', 'id: id Mongo du conseiller à transferer');
  program.option('-a, --ancienne <ancienne>', 'ancienne: id mongo structure qui deviendra ancienne structure du conseiller');
  program.option('-n, --nouvelle <nouvelle>', 'nouvelle: structure de destination');
  program.helpOption('-e', 'HELP command');
  program.parse(process.argv);

  let idCNFS = new ObjectID(program.id);
  let ancienneSA = new ObjectID(program.ancienne);
  let nouvelleSA = new ObjectID(program.nouvelle);

  if (!idCNFS || !ancienneSA || !nouvelleSA) {
    exit('Paramètres invalides. Veuillez préciser un id et un nombre en kilomètre');
    return;
  }

  const cnfsRecrute = await db.collection('misesEnRelation').findOne({ 'conseiller.$id': idCNFS, 'structure.$id': ancienneSA, 'statut': 'finalisee' });
  if (!cnfsRecrute) {
    exit(`Le Cnfs avec l'id ${idCNFS} n'est pas recruté.`);
    return;
  }
  const structureDestination = await db.collection('structures').findOne({ '_id': nouvelleSA });

  if (structureDestination.statut !== 'VALIDATION_COSELEC') {
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
    exit(`La structure destinataire est seulement autorisé à ${dernierCoselec.nombreConseillersCoselec} et à déjà ${misesEnRelationRecrutees} validé(s)/recrutée(s)`);
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
    'ancienneStructureId': nouvelleSA,
    'date': new Date()
  };

  if (misesEnrelationNouvelleSA) {
    const connection = app.get('mongodb');
    const database = connection.substr(connection.lastIndexOf('/') + 1);
    let conseiller = await db.collection('conseillers').findOne({ _id: idCNFS });
    let structure = await db.collection('structures').findOne({ _id: nouvelleSA });

    await db.collection('misesEnRelation').insertOne({
      conseiller: new DBRef('conseillers', idCNFS, database),
      structure: new DBRef('structures', nouvelleSA, database),
      statut: 'finalisee',
      createdAt: new Date(),
      conseillerObj: conseiller,
      structureObj: structure,
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

  logger.info(`Le conseiller id: ${idCNFS} a été transférer par la structure: ${ancienneSA} vers la structure: ${nouvelleSA}`);
  exit();
});
