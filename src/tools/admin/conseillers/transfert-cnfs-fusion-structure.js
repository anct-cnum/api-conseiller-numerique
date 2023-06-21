#!/usr/bin/env node
'use strict';
require('dotenv').config();
const { program } = require('commander');
const { execute } = require('../../utils');
const { DBRef, ObjectID } = require('mongodb');
const utils = require('../../../utils/index');

const miseEnRelationCnfs = db => async (idCNFS, ancienneSA) => await db.collection('misesEnRelation').findOne({
  'conseiller.$id': idCNFS, 'structure.$id': ancienneSA,
  'statut': { '$in': ['finalisee', 'nouvelle_rupture', 'finalisee_rupture'] }
});
const updateIdStructureRupture = db => async (cnfsRecrute, idCNFS, ancienneSA, nouvelleSA, structureDestination) => {
  await db.collection('conseillers').updateOne(
    { '_id': idCNFS, 'ruptures': { '$elemMatch': { 'structureId': ancienneSA } } },
    { $set: { 'ruptures.$.structureId': nouvelleSA }
    });
  await db.collection('conseillersRuptures').updateOne(
    { conseillerId: idCNFS, structureId: ancienneSA },
    { $set: { structureId: nouvelleSA }
    });
  await db.collection('misesEnRelation').updateOne(
    { _id: cnfsRecrute?._id },
    { $set: { 'structure.$id': nouvelleSA, 'structureObj': structureDestination }
    });
};
const countCnfsNouvelleSA = db => async nouvelleSA => await db.collection('misesEnRelation').countDocuments({
  'statut': { $in: ['recrutee', 'finalisee'] },
  'structure.$id': nouvelleSA
});
const initPermAncienneSA = db => async (idCNFS, ancienneSA, nouvelleSA) => await db.collection('permanences').find(
  { 'adresse.codeCommune': { '$exists': false },
    '$or': [{ 'structure.$id': ancienneSA, 'conseillers': { $in: [idCNFS] } }, { 'structure.$id': nouvelleSA }]
  }).toArray();
const getStructurenouvelle = db => async nouvelleSA => await db.collection('structures').findOne({ '_id': nouvelleSA });
const majConseillerTransfert = db => async (idCNFS, nouvelleSA) =>
  await db.collection('conseillers').updateOne({ _id: idCNFS }, { $set: { structureId: nouvelleSA } });
const majMiseEnRelationAncienneSA = db => async (idCNFS, ancienneSA, nouvelleSA, cnfsRecrute) => {
  await db.collection('misesEnRelation').updateOne(
    { 'conseiller.$id': idCNFS, 'structure.$id': ancienneSA },
    { $set: {
      statut: cnfsRecrute?.conseillerObj?.disponible === false ? 'finalisee_non_disponible' : 'nouvelle',
      dateRecrutement: null,
      fusion: {
        'destinationStructureId': nouvelleSA,
        'date': new Date()
      }
    }
    });
};
const majMiseEnRelationNouvelleSA = db => async (database, idCNFS, ancienneSA, nouvelleSA, cnfsRecrute, misesEnrelationNouvelleSA) => {
  const fusion = {
    'ancienneStructureId': ancienneSA,
    'date': new Date()
  };
  const conseiller = await db.collection('conseillers').findOne({ _id: idCNFS });
  if (!misesEnrelationNouvelleSA) {
    const structure = await db.collection('structures').findOne({ _id: nouvelleSA });
    await db.collection('misesEnRelation').insertOne({
      conseiller: new DBRef('conseillers', idCNFS, database),
      structure: new DBRef('structures', nouvelleSA, database),
      statut: 'finalisee',
      distance: cnfsRecrute?.distance,
      createdAt: new Date(),
      conseillerObj: conseiller,
      structureObj: structure,
      dateRecrutement: cnfsRecrute?.dateRecrutement,
      fusion
    });
  } else {
    await db.collection('misesEnRelation').updateOne(
      { 'conseiller.$id': idCNFS, 'structure.$id': nouvelleSA },
      { $set: {
        statut: 'finalisee',
        dateRecrutement: cnfsRecrute?.dateRecrutement,
        fusion
      }
      });
  }
  await db.collection('misesEnRelation').updateMany({ 'conseiller.$id': idCNFS }, { $set: { 'conseillerObj': conseiller } });
};
const getMiseEnRelationNouvelleSA = db => async (idCNFS, nouvelleSA) =>
  await db.collection('misesEnRelation').findOne({ 'conseiller.$id': idCNFS, 'structure.$id': nouvelleSA });
const majCraConseiller = db => async (idCNFS, ancienneSA, nouvelleSA) =>
  await db.collection('cras').updateMany(
    { 'conseiller.$id': idCNFS,
      'structure.$id': ancienneSA
    }, {
      $set: { 'structure.$id': nouvelleSA }
    });
const getPermsAncienneSA = db => async (idCNFS, ancienneSA) => await db.collection('permanences').find(
  { 'conseillers': { $in: [idCNFS] }, 'structure.$id': ancienneSA },
).toArray();
const getPermsNouvelleSA = db => async nouvelleSA => await db.collection('permanences').find(
  { 'structure.$id': nouvelleSA }
).toArray();
const updateIdStructurePerm = db => async (permanence, nouvelleSA) => await db.collection('permanences').updateOne(
  { _id: permanence?._id },
  { $set: { 'structure.$id': nouvelleSA } }
);
const updatePullPermanence = db => async (permanence, idCNFS) =>
  await db.collection('permanences').updateOne(
    { _id: permanence?._id },
    { $pull: { conseillers: idCNFS, conseillersItinerants: idCNFS, lieuPrincipalPour: idCNFS } }
  );
const updateCrasPermanenceId = db => async (permanence, idCNFS, permId) =>
  await db.collection('cras').updateMany(
    { 'permanence.$id': permanence?._id, 'conseiller.$id': idCNFS },
    { $set: { 'permanence.$id': permId } }
  );
const pushConseillerPerm = db => async (idCNFS, idPerm) =>
  await db.collection('permanences').updateOne(
    { _id: idPerm },
    { $push: { conseillers: idCNFS } }
  );
const createPermNouvelleSA = db => async (permanence, idCNFS, nouvelleSA) => {
  const insertPermanence = {
    ...permanence,
    'conseillers': [idCNFS],
    'conseillersItinerants': permanence.conseillersItinerants.filter(i => String(i) === String(idCNFS)),
    'lieuPrincipalPour': permanence.lieuPrincipalPour.filter(i => String(i) === String(idCNFS)),
    'updatedBy': idCNFS,
    'updatedAt': new Date()
  };
  delete insertPermanence._id;
  insertPermanence.structure.oid = nouvelleSA;
  return await db.collection('permanences').insertOne(insertPermanence);
};

execute(__filename, async ({ db, logger, exit, app }) => {

  program.option('-i, --id <id>', 'id: id Mongo du conseiller à transférer');
  program.option('-a, --ancienne <ancienne>', 'ancienne: id mongo structure qui deviendra ancienne structure du conseiller');
  program.option('-n, --nouvelle <nouvelle>', 'nouvelle: structure de destination');
  program.option('-ig, --ignored', 'ignored: ignorer la partie controle diff région et departement entre les 2 structures');
  program.helpOption('-e', 'HELP command');
  program.parse(process.argv);

  let idCNFS = program.id;
  let ancienneSA = program.ancienne;
  let nouvelleSA = program.nouvelle;
  let ignored = program.ignored;

  if (!idCNFS || !ancienneSA || !nouvelleSA) {
    exit('Paramètres invalides. Veuillez préciser un id conseiller / id ancienne structure & id nouvelle structure');
    return;
  }

  idCNFS = new ObjectID(program.id);
  ancienneSA = new ObjectID(program.ancienne);
  nouvelleSA = new ObjectID(program.nouvelle);
  const connection = app.get('mongodb');
  const database = connection.substr(connection.lastIndexOf('/') + 1);

  const cnfsRecrute = await miseEnRelationCnfs(db)(idCNFS, ancienneSA);
  if (!cnfsRecrute) {
    exit(`Aucune mise en relation entre la strcture et le conseiller.`);
    return;
  }
  if (cnfsRecrute?.statut === 'nouvelle_rupture') {
    exit(`Rupture non validé par un Admin`);
    return;
  }
  const structureDestination = await getStructurenouvelle(db)(nouvelleSA);
  if (cnfsRecrute?.statut === 'finalisee_rupture') {
    await updateIdStructureRupture(db)(cnfsRecrute, idCNFS, ancienneSA, nouvelleSA, structureDestination);
    logger.info(`Rupture transferer de la structure id ${cnfsRecrute.structureObj.idPG} vers la nouvelle structure id ${structureDestination.idPG}`);
    return;
  }
  if (cnfsRecrute?.statut === 'finalisee') {
    if (structureDestination?.statut !== 'VALIDATION_COSELEC') {
      exit(`La structure destinataire n'est pas 'VALIDATION_COSELEC' mais ${structureDestination.statut}`);
      return;
    }
    let dernierCoselec = utils.getCoselec(structureDestination);
    const misesEnRelationRecrutees = await countCnfsNouvelleSA(db)(nouvelleSA);
    if (misesEnRelationRecrutees >= dernierCoselec.nombreConseillersCoselec) {
      exit(`Le quota de la structure autorisé est atteint: ${misesEnRelationRecrutees} / ${dernierCoselec.nombreConseillersCoselec}  validé(s)/recrutée(s)`);
      return;
    }

    // eslint-disable-next-line max-len
    if (!ignored && (cnfsRecrute?.conseillerObj?.codeRegionStructure !== structureDestination?.codeRegion || cnfsRecrute?.conseillerObj?.codeDepartementStructure !== structureDestination?.codeDepartement)) {
      // eslint-disable-next-line max-len
      exit(`Une différence de departement ou région a été détecté ! Region:${cnfsRecrute?.conseillerObj?.codeRegionStructure} vs ${structureDestination?.codeRegion} / departement: ${cnfsRecrute?.conseillerObj?.codeDepartementStructure} vs ${structureDestination?.codeDepartement}`);
      return;
    }
    const permNonTraiter = await initPermAncienneSA(db)(idCNFS, ancienneSA, nouvelleSA);
    if (permNonTraiter.length >= 1) {
      exit(`Veuillez d'abord traiter les ${permNonTraiter.length} permanences sans code commune => ${permNonTraiter.map(i => i._id)}`);
      return;
    }
    await majConseillerTransfert(db)(idCNFS, nouvelleSA);
    await majMiseEnRelationAncienneSA(db)(idCNFS, ancienneSA, nouvelleSA, cnfsRecrute);
    const misesEnrelationNouvelleSA = await getMiseEnRelationNouvelleSA(db)(idCNFS, nouvelleSA);
    await majMiseEnRelationNouvelleSA(db)(database, idCNFS, ancienneSA, nouvelleSA, cnfsRecrute, misesEnrelationNouvelleSA);
    await majCraConseiller(db)(idCNFS, ancienneSA, nouvelleSA);
    const permAncienneSA = await getPermsAncienneSA(db)(idCNFS, ancienneSA);
    const permNouvelleSA = await getPermsNouvelleSA(db)(nouvelleSA);

    for (let permanence of permAncienneSA) {
    // eslint-disable-next-line max-len
      const verifDoublon = permNouvelleSA.filter(i => String(Object.values(i.location?.coordinates)) === String(Object.values(permanence.location?.coordinates)) && String(Object.values(i.adresse)) === String(Object.values(permanence.adresse)));
      if (verifDoublon.length === 0 && permanence.conseillers.length === 1) {
        await updateIdStructurePerm(db)(permanence, nouvelleSA);
      }
      if (verifDoublon.length === 0 && permanence.conseillers.length !== 1) {
        await updatePullPermanence(db)(permanence, idCNFS);
        const permnouvelleSA = await createPermNouvelleSA(db)(permanence, idCNFS, nouvelleSA);
        await updateCrasPermanenceId(db)(permanence, idCNFS, permnouvelleSA.insertedId);
      }
      if (verifDoublon.length !== 0) {
        await updatePullPermanence(db)(permanence, idCNFS);
        if (!verifDoublon[0].conseillers.find(i => String(i) === String(idCNFS))) {// Dans le cas où il y a des doublons de perm côté CN
          await pushConseillerPerm(db)(idCNFS, verifDoublon[0]?._id);
        }
        await updateCrasPermanenceId(db)(permanence, idCNFS, verifDoublon[0]?._id);
      }
    }
  }
  logger.info(`Le conseiller id: ${idCNFS} a été transféré de la structure: ${ancienneSA} vers la structure: ${nouvelleSA} (FUSION)`);
  exit();
});
