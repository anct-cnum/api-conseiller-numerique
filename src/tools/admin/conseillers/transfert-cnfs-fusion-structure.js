#!/usr/bin/env node
'use strict';
require('dotenv').config();
const { program } = require('commander');
const { execute } = require('../../utils');
const { DBRef, ObjectID } = require('mongodb');
const utils = require('../../../utils/index');

const createMiseEnRelationReconventionnement = db => async (
  misesEnRelationReconventionnement,
  idCNFS,
  idNouvelleSA,
  database,
  conseiller,
  structure,
  fusion) => {
  if (misesEnRelationReconventionnement?.statut === 'renouvellement_initiee') {
    await db.collection('misesEnRelation').insertOne({
      conseiller: new DBRef('conseillers', idCNFS, database),
      structure: new DBRef('structures', idNouvelleSA, database),
      statut: 'renouvellement_initiee',
      distance: misesEnRelationReconventionnement?.distance,
      createdAt: new Date(),
      conseillerObj: conseiller,
      structureObj: structure,
      dateDebutDeContrat: misesEnRelationReconventionnement?.dateDebutDeContrat,
      dateFinDeContrat: misesEnRelationReconventionnement?.dateFinDeContrat,
      typeDeContrat: misesEnRelationReconventionnement?.typeDeContrat,
      ...(misesEnRelationReconventionnement?.salaire && {
        salaire: misesEnRelationReconventionnement?.salaire
      }),
      phaseConventionnement: '2',
      fusion
    });
    const miseEnRelationInserted = await db.collection('misesEnRelation').findOne({
      'conseiller.$id': idCNFS,
      'structure.$id': idNouvelleSA,
      'statut': 'renouvellement_initiee'
    });
    return { miseEnRelationReconventionnement: miseEnRelationInserted._id };
  }
  if (misesEnRelationReconventionnement?.statut === 'terminee') {
    await db.collection('misesEnRelation').insertOne({
      conseiller: new DBRef('conseillers', idCNFS, database),
      structure: new DBRef('structures', idNouvelleSA, database),
      statut: 'terminee',
      distance: misesEnRelationReconventionnement?.distance,
      createdAt: new Date(),
      conseillerObj: conseiller,
      structureObj: structure,
      ...(misesEnRelationReconventionnement?.dateDebutDeContrat && {
        dateDebutDeContrat: misesEnRelationReconventionnement.dateDebutDeContrat
      }),
      ...(misesEnRelationReconventionnement?.dateFinDeContrat && {
        dateFinDeContrat: misesEnRelationReconventionnement.dateFinDeContrat
      }),
      ...(misesEnRelationReconventionnement?.typeDeContrat && {
        typeDeContrat: misesEnRelationReconventionnement.typeDeContrat
      }),
      ...(misesEnRelationReconventionnement?.salaire && {
        salaire: misesEnRelationReconventionnement.salaire
      }),
      reconventionnement: true,
      fusion
    });
    const miseEnRelationInserted = await db.collection('misesEnRelation').findOne({
      'conseiller.$id': idCNFS,
      'structure.$id': idNouvelleSA,
      'statut': 'terminee'
    });
    return { phaseConventionnement: '2', miseEnRelationConventionnement: miseEnRelationInserted._id };
  }
  return {};
};

const miseEnRelationCnfs = db => async (idCNFS, idAncienneSA) => await db.collection('misesEnRelation').findOne({
  'conseiller.$id': idCNFS, 'structure.$id': idAncienneSA,
  'statut': { '$in': ['finalisee', 'nouvelle_rupture', 'finalisee_rupture'] }
});
const updateIdStructureRupture = db => async (cnfsRecrute, idCNFS, idAncienneSA, idNouvelleSA, structureDestination) => {
  await db.collection('conseillers').updateOne(
    { '_id': idCNFS, 'ruptures': { '$elemMatch': { 'structureId': idAncienneSA } } },
    {
      $set: { 'ruptures.$.structureId': idNouvelleSA }
    });
  await db.collection('conseillersRuptures').updateOne(
    { conseillerId: idCNFS, structureId: idAncienneSA },
    {
      $set: { structureId: idNouvelleSA }
    });
  await db.collection('misesEnRelation').deleteOne({ '_id': { '$ne': cnfsRecrute?._id }, 'conseiller.$id': idCNFS, 'structure.$id': idNouvelleSA });
  await db.collection('misesEnRelation').updateOne(
    { _id: cnfsRecrute?._id },
    {
      $set: { 'structure.$id': idNouvelleSA, 'structureObj': structureDestination }
    });
  await db.collection('cras').updateMany(
    { 'structure.$id': idAncienneSA, 'conseiller.$id': idCNFS },
    {
      $set: { 'structure.$id': idNouvelleSA }
    });
};
const countCnfsNouvelleSA = db => async idNouvelleSA => await db.collection('misesEnRelation').countDocuments({
  'statut': { $in: ['recrutee', 'finalisee'] },
  'structure.$id': idNouvelleSA
});
const initPermAncienneSA = db => async (idCNFS, idAncienneSA, idNouvelleSA) => await db.collection('permanences').find(
  {
    'adresse.codeCommune': { '$exists': false },
    '$or': [{ 'structure.$id': idAncienneSA, 'conseillers': { $in: [idCNFS] } }, { 'structure.$id': idNouvelleSA }]
  }).toArray();
const getStructure = db => async idStructure => await db.collection('structures').findOne({ '_id': idStructure });
const majConseillerTransfert = db => async (idCNFS, idNouvelleSA) =>
  await db.collection('conseillers').updateOne({ _id: idCNFS }, { $set: { structureId: idNouvelleSA } });
const suppressionMiseEnRelationAncienneSA = db => async (idCNFS, idAncienneSA) => {
  await db.collection('misesEnRelation').deleteMany(
    {
      'conseiller.$id': idCNFS,
      'structure.$id': idAncienneSA,
    });
};
const majMiseEnRelationNouvelleSA = db => async (database, idCNFS, idAncienneSA, idNouvelleSA, cnfsRecrute, misesEnrelationNouvelleSA) => {
  const fusion = {
    'ancienneStructureId': idAncienneSA,
    'date': new Date()
  };
  const conseiller = await db.collection('conseillers').findOne({ _id: idCNFS });
  const structure = await db.collection('structures').findOne({ _id: idNouvelleSA });
  const misesEnRelationReconventionnement = await db.collection('misesEnRelation').findOne({
    'conseiller.$id': idCNFS,
    'structure.$id': idAncienneSA,
    'statut': { $in: ['renouvellement_initiee', 'terminee'] }
  });
  const attributReconventionnement = await createMiseEnRelationReconventionnement(db)(
    misesEnRelationReconventionnement,
    idCNFS,
    idNouvelleSA,
    database,
    conseiller,
    structure,
    fusion
  );
  const objectContrat = {
    statut: 'finalisee',
    ...(cnfsRecrute?.dateDebutDeContrat && {
      dateDebutDeContrat: cnfsRecrute.dateDebutDeContrat
    }),
    ...(cnfsRecrute?.dateFinDeContrat && {
      dateFinDeContrat: cnfsRecrute.dateFinDeContrat
    }),
    ...(cnfsRecrute?.typeDeContrat && {
      typeDeContrat: cnfsRecrute.typeDeContrat
    }),
    ...(cnfsRecrute?.salaire && {
      salaire: cnfsRecrute.salaire
    }),
    ...(cnfsRecrute?.reconventionnement && {
      reconventionnement: true
    }),
    fusion,
    ...attributReconventionnement
  };
  if (!misesEnRelationReconventionnement && utils.checkStructurePhase2(structure?.conventionnement?.statut)) {
    Object.assign(objectContrat, { phaseConventionnement: '2' });
  }
  if (!misesEnrelationNouvelleSA) {
    await db.collection('misesEnRelation').insertOne({
      conseiller: new DBRef('conseillers', idCNFS, database),
      structure: new DBRef('structures', idNouvelleSA, database),
      distance: cnfsRecrute?.distance,
      createdAt: new Date(),
      conseillerObj: conseiller,
      structureObj: structure,
      ...objectContrat
    });
  } else {
    await db.collection('misesEnRelation').updateOne(
      { 'conseiller.$id': idCNFS, 'structure.$id': idNouvelleSA },
      {
        $set: objectContrat
      });
  }
  const miseEnRelationFinalisee = await db.collection('misesEnRelation').findOne({
    'conseiller.$id': idCNFS,
    'structure.$id': idNouvelleSA,
    'statut': 'finalisee'
  });
  if (misesEnRelationReconventionnement?.statut === 'renouvellement_initiee') {
    await db.collection('misesEnRelation').updateOne(
      {
        'conseiller.$id': idCNFS,
        'structure.$id': idNouvelleSA,
        'statut': 'renouvellement_initiee'
      },
      {
        $set: {
          miseEnRelationConventionnement: miseEnRelationFinalisee._id
        }
      });
  }
  if (misesEnRelationReconventionnement?.statut === 'terminee') {
    await db.collection('misesEnRelation').updateOne(
      {
        'conseiller.$id': idCNFS,
        'structure.$id': idNouvelleSA,
        'statut': 'terminee'
      },
      {
        $set: {
          miseEnRelationReconventionnement: miseEnRelationFinalisee._id
        }
      });
  }
  await db.collection('misesEnRelation').updateMany({ 'conseiller.$id': idCNFS }, { $set: { 'conseillerObj': conseiller } });
};
const getMiseEnRelationNouvelleSA = db => async (idCNFS, idNouvelleSA) =>
  await db.collection('misesEnRelation').findOne(
    {
      'conseiller.$id': idCNFS,
      'structure.$id': idNouvelleSA,
      'statut': { $in: ['nouvelle', 'interessee', 'nonInteressee'] }
    });
const majCraConseiller = db => async (idCNFS, idAncienneSA, idNouvelleSA) =>
  await db.collection('cras').updateMany(
    {
      'conseiller.$id': idCNFS,
      'structure.$id': idAncienneSA
    }, {
      $set: { 'structure.$id': idNouvelleSA }
    });
const getPermsAncienneSA = db => async (idCNFS, idAncienneSA) => await db.collection('permanences').find(
  { 'conseillers': { $in: [idCNFS] }, 'structure.$id': idAncienneSA },
).toArray();
const getPermsNouvelleSA = db => async idNouvelleSA => await db.collection('permanences').find(
  { 'structure.$id': idNouvelleSA }
).toArray();
const updateIdStructurePerm = db => async (permanence, idNouvelleSA) => await db.collection('permanences').updateOne(
  { _id: permanence?._id },
  { $set: { 'structure.$id': idNouvelleSA } }
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
const pushConseillerPerm = db => async (permanence, idCNFS, idPerm) => {
  const conseillersItinerants = permanence.conseillersItinerants.map(i => String(i)).includes(String(idCNFS)) ? { conseillersItinerants: idCNFS } : {};
  const lieuPrincipalPour = permanence.lieuPrincipalPour.map(i => String(i)).includes(String(idCNFS)) ? { lieuPrincipalPour: idCNFS } : {};
  await db.collection('permanences').updateOne(
    { _id: idPerm },
    { $push: { conseillers: idCNFS, ...lieuPrincipalPour, ...conseillersItinerants } }
  );
};
const createPermNouvelleSA = db => async (permanence, idCNFS, idNouvelleSA) => {
  const insertPermanence = {
    ...permanence,
    'conseillers': [idCNFS],
    'conseillersItinerants': permanence.conseillersItinerants.filter(i => String(i) === String(idCNFS)),
    'lieuPrincipalPour': permanence.lieuPrincipalPour.filter(i => String(i) === String(idCNFS)),
    'updatedBy': idCNFS,
    'updatedAt': new Date()
  };
  delete insertPermanence._id;
  insertPermanence.structure.oid = idNouvelleSA;
  return await db.collection('permanences').insertOne(insertPermanence);
};
const deletePermAncienne = db => async idPermanence => await db.collection('permanences').deleteOne({
  '_id': idPermanence
});

execute(__filename, async ({ db, logger, exit, app }) => {

  program.option('-i, --id <id>', 'id: id Mongo du conseiller à transférer');
  program.option('-a, --ancienne <ancienne>', 'ancienne: id mongo structure qui deviendra ancienne structure du conseiller');
  program.option('-n, --nouvelle <nouvelle>', 'nouvelle: structure de destination');
  program.option('-ig, --ignored', 'ignored: ignorer la partie controle diff région et departement entre les 2 structures');
  program.helpOption('-e', 'HELP command');
  program.parse(process.argv);

  let idCNFS = program.id;
  let idAncienneSA = program.ancienne;
  let idNouvelleSA = program.nouvelle;
  let ignored = program.ignored;

  if (!idCNFS || !idAncienneSA || !idNouvelleSA) {
    exit('Paramètres invalides. Veuillez préciser un id conseiller / id ancienne structure & id nouvelle structure');
    return;
  }

  idCNFS = new ObjectID(program.id);
  idAncienneSA = new ObjectID(program.ancienne);
  idNouvelleSA = new ObjectID(program.nouvelle);
  const connection = app.get('mongodb');
  const database = connection.substr(connection.lastIndexOf('/') + 1);

  const cnfsRecrute = await miseEnRelationCnfs(db)(idCNFS, idAncienneSA);
  if (!cnfsRecrute) {
    exit(`Aucune mise en relation entre la structure et le conseiller.`);
    return;
  }
  if (cnfsRecrute?.statut === 'nouvelle_rupture') {
    exit(`Rupture non validée par un Admin`);
    return;
  }
  const structureDestination = await getStructure(db)(idNouvelleSA);
  const structureOriginelle = await getStructure(db)(idAncienneSA);
  if (structureDestination?.statut !== 'VALIDATION_COSELEC') {
    exit(`La structure destinataire n'est pas 'VALIDATION_COSELEC' mais ${structureDestination.statut}`);
    return;
  }
  // eslint-disable-next-line max-len
  if (structureDestination?.conventionnement?.statut !== 'RECONVENTIONNEMENT_VALIDÉ' && structureOriginelle?.conventionnement?.statut === 'RECONVENTIONNEMENT_VALIDÉ') {
    exit(`La structure destinataire n'est pas en 'RECONVENTIONNEMENT_VALIDÉ' mais ${structureDestination?.conventionnement?.statut}`);
    return;
  }
  if (cnfsRecrute?.statut === 'finalisee_rupture') {
    await updateIdStructureRupture(db)(cnfsRecrute, idCNFS, idAncienneSA, idNouvelleSA, structureDestination);
    logger.info(`Rupture transferée de la structure id ${cnfsRecrute.structureObj.idPG} vers la nouvelle structure id ${structureDestination.idPG}`);
    return;
  }
  if (cnfsRecrute?.statut === 'finalisee') {
    const dernierCoselec = utils.getCoselec(structureDestination);
    const misesEnRelationRecrutees = await countCnfsNouvelleSA(db)(idNouvelleSA);
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
    const permNonTraiter = await initPermAncienneSA(db)(idCNFS, idAncienneSA, idNouvelleSA);
    if (permNonTraiter.length >= 1) {
      exit(`Veuillez d'abord traiter les ${permNonTraiter.length} permanences sans code commune => ${permNonTraiter.map(i => i._id)}`);
      return;
    }
    await majConseillerTransfert(db)(idCNFS, idNouvelleSA);
    const misesEnrelationNouvelleSA = await getMiseEnRelationNouvelleSA(db)(idCNFS, idNouvelleSA);
    await majMiseEnRelationNouvelleSA(db)(database, idCNFS, idAncienneSA, idNouvelleSA, cnfsRecrute, misesEnrelationNouvelleSA);
    await suppressionMiseEnRelationAncienneSA(db)(idCNFS, idAncienneSA);
    await majCraConseiller(db)(idCNFS, idAncienneSA, idNouvelleSA);
    const permAncienneSA = await getPermsAncienneSA(db)(idCNFS, idAncienneSA);
    const permNouvelleSA = await getPermsNouvelleSA(db)(idNouvelleSA);

    for (let permanence of permAncienneSA) {
      // eslint-disable-next-line max-len
      const verifDoublon = permNouvelleSA.filter(i => String(Object.values(i.location?.coordinates)) === String(Object.values(permanence.location?.coordinates)) && String(Object.values(i.adresse)) === String(Object.values(permanence.adresse)));
      if (verifDoublon.length === 0 && permanence.conseillers.length === 1) {
        await updateIdStructurePerm(db)(permanence, idNouvelleSA);
      }
      if (verifDoublon.length === 0 && permanence.conseillers.length !== 1) {
        await updatePullPermanence(db)(permanence, idCNFS);
        const permnouvelleSA = await createPermNouvelleSA(db)(permanence, idCNFS, idNouvelleSA);
        await updateCrasPermanenceId(db)(permanence, idCNFS, permnouvelleSA.insertedId);
      }
      if (verifDoublon.length !== 0) {
        await updatePullPermanence(db)(permanence, idCNFS);
        if (!verifDoublon[0].conseillers.find(i => String(i) === String(idCNFS))) {// Dans le cas où il y a des doublons de perm côté CN
          await pushConseillerPerm(db)(permanence, idCNFS, verifDoublon[0]?._id);
        }
        await updateCrasPermanenceId(db)(permanence, idCNFS, verifDoublon[0]?._id);
      }
      if (permanence?.conseillers?.length === 1) {
        await deletePermAncienne(db)(permanence._id);
      }
    }
  }
  logger.info(`Le conseiller id: ${idCNFS} a été transféré de la structure: ${idAncienneSA} vers la structure: ${idNouvelleSA} (FUSION)`);
  exit();
});
