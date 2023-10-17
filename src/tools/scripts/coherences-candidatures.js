#!/usr/bin/env node
'use strict';
require('dotenv').config();

const { execute } = require('../utils');
const { Pool } = require('pg');
const pool = new Pool();
const { ObjectId } = require('mongodb');
const { S3Client, ListObjectsV2Command } = require('@aws-sdk/client-s3');

const getConseillersPG = async date => {
  const { rows } = await pool.query(`
  SELECT id
  FROM djapp_coach
  WHERE created < $1
  ORDER BY id`,
  [date]);

  return rows;
};

const getConseillersMongo = db => async date =>
  await db.collection('conseillers').find({ createdAt: { $lt: date } }).project({ _id: 0, idPG: 1 }).sort({ idPG: 1 }).toArray();

const getStructuresPG = async date => {
  const { rows } = await pool.query(`
  SELECT id
  FROM djapp_hostorganization
  WHERE created < $1
  ORDER BY id`,
  [date]);

  return rows;
};

const getStructuresMongo = db => async date =>
  await db.collection('structures').find({ createdAt: { $lt: date } }).project({ _id: 0, idPG: 1 }).sort({ idPG: 1 }).toArray();

const getCandidaturesSupprimees = async db =>
  await db.collection('conseillersSupprimes').find({ }).project({
    '_id': 0, 'conseiller._id': 1,
    'conseiller.idPG': 1
  }).sort({ 'conseiller.idPG': 1 }).toArray();

const getCvConseillers = async db =>
  await db.collection('conseillers').find({ cv: { $exists: true } }).sort({ 'cv.file': 1 }).toArray();

const getCvS3 = async app => {
  const awsConfig = app.get('aws');
  const client = new S3Client({
    region: awsConfig.region,
    credentials: {
      accessKeyId: awsConfig.access_key_id,
      secretAccessKey: awsConfig.secret_access_key,
    },
    endpoint: awsConfig.endpoint,
  });

  const command = new ListObjectsV2Command({
    Bucket: awsConfig.cv_bucket
  });
  let isTruncated = true;

  let cvList = [];

  while (isTruncated) {
    const { Contents, IsTruncated, NextContinuationToken } = await client.send(command);
    cvList.push(Contents.map(cv => cv.Key));
    isTruncated = IsTruncated;
    command.input.ContinuationToken = NextContinuationToken;
  }

  return cvList.flat(Infinity);
};

const getUsersCandidats = async db =>
  await db.collection('users').find({ roles: { $in: ['candidat'] } }).sort({ 'entity.oid': 1, 'name': 1 }).toArray();

const getCandidats = async db =>
  await db.collection('conseillers').find({ statut: { $ne: 'RECRUTE' }, userCreated: true }).project({ _id: 1 }).sort({ _id: 1 }).toArray();

const getCandidatsWithoutUser = async db =>
  await db.collection('conseillers').find({ statut: { $ne: 'RECRUTE' }, userCreated: false }).project({ _id: 1 }).sort({ _id: 1 }).toArray();

const getMisesEnRelation = db => async oids =>
  await db.collection('misesEnRelation').find({ 'conseiller.$id': { $in: oids } }).project({ 'conseiller.oid': 1 }).toArray();

execute(__filename, async ({ app, db, logger, exit }) => {
  // On prend le début de journée pour comparer avec PG à cause de la synchro qui peut différer
  let date = new Date();
  date.setUTCHours(0, 0, 0, 0);

  // 1. Cohérence conseillers VS djapp_coach
  let conseillersPG = await getConseillersPG(date);
  conseillersPG = conseillersPG.map(conseiller => conseiller.id);
  let conseillersMongo = await getConseillersMongo(db)(date);
  conseillersMongo = conseillersMongo.map(conseiller => conseiller.idPG);

  const diffConseillers = conseillersMongo.filter(id => !conseillersPG.includes(id)).concat(conseillersPG.filter(id => !conseillersMongo.includes(id)));

  if (diffConseillers.length === 0) {
    logger.info(`1. Candidats entre PG et Mongo OK`);
  } else {
    logger.warn(`1. Liste des idPG en différence entre candidats PG et Mongo : ${JSON.stringify(diffConseillers)}`);
  }

  // 2. Cohérence structures VS djapp_hostorganization
  let structuresPG = await getStructuresPG(date);
  structuresPG = structuresPG.map(structure => structure.id);
  let structuresMongo = await getStructuresMongo(db)(date);
  structuresMongo = structuresMongo.map(structure => structure.idPG);

  const diffStructures = structuresMongo.filter(id => !structuresPG.includes(id)).concat(structuresPG.filter(id => !structuresMongo.includes(id)));

  if (diffStructures.length === 0) {
    logger.info(`2. Structures entre PG et Mongo OK`);
  } else {
    logger.warn(`2. Liste des idPG en différence entre structures PG et Mongo : ${JSON.stringify(diffStructures)}`);
  }

  // 3. Cohérence sans doublons de candidatures supprimées
  let candidaturesSupprimees = await getCandidaturesSupprimees(db);
  candidaturesSupprimees = candidaturesSupprimees.map(candidature => candidature.conseiller.idPG);
  const doublonsCandidatures = candidaturesSupprimees.filter((candidature, index) => candidaturesSupprimees.indexOf(candidature) !== index);
  if (doublonsCandidatures.length === 0) {
    logger.info(`3. Doublons de candidatures supprimées OK`);
  } else {
    const countDoublons = {};
    doublonsCandidatures.forEach(doublon => {
      countDoublons[doublon] = (countDoublons[doublon] || 0) + 1;
    });
    logger.warn(`3. Liste des doublons de candidatures : ${JSON.stringify(countDoublons)}`);
  }

  // 4. Cohérence CVs S3 VS Mongo
  let cvConseillers = await getCvConseillers(db);
  cvConseillers = cvConseillers.map(conseiller => conseiller.cv.file);
  cvConseillers = [...new Set(cvConseillers)];
  let cvS3 = await getCvS3(app);

  const diffCV = cvConseillers.filter(cv => !cvS3.includes(cv)).concat(cvS3.filter(cv => !cvConseillers.includes(cv)));

  if (diffCV.length === 0) {
    logger.info(`4. CVs entre Mongo et S3 OK`);
  } else {
    logger.warn(`4. Liste des CVs incohérents : ${JSON.stringify(diffCV)}`);
  }

  // 5. Cohérence users des candidats avec userCreated à true
  let usersCandidats = await getUsersCandidats(db);
  usersCandidats = usersCandidats.map(user => String(user.entity.oid));
  let candidats = await getCandidats(db);
  candidats = candidats.map(candidat => String(candidat._id));

  const diffUsers = usersCandidats.filter(id => !candidats.includes(id)).concat(candidats.filter(id => !usersCandidats.includes(id)));

  if (diffUsers.length === 0) {
    logger.info(`5. Candidatures actuelles avec user OK`);
  } else {
    logger.warn(`5. Liste des utilisateurs incohérents pour les userCreated à true : ${JSON.stringify(diffUsers)}`);
  }

  // 6. Cohérence users des candidats avec userCreated à false
  let candidatsWithoutUser = await getCandidatsWithoutUser(db);
  candidatsWithoutUser = candidatsWithoutUser.map(candidat => String(candidat._id));

  const usersCreated = usersCandidats.filter(id => candidatsWithoutUser.includes(id));

  if (usersCreated.length === 0) {
    logger.info(`6. Candidatures actuelles sans user OK`);
  } else {
    logger.warn(`6. Liste des utilisateurs incohérents pour les userCreated à false : ${JSON.stringify(usersCreated)}`);
  }

  // 7. Cohérence user inexistant pour les candidatures supprimées
  let candidatsSupprimees = await getCandidaturesSupprimees(db);
  candidatsSupprimees = candidatsSupprimees.map(candidature => candidature.conseiller._id);

  const userSupprimesKO = candidatsSupprimees.filter(id => usersCandidats.includes(id));

  if (userSupprimesKO.length === 0) {
    logger.info(`7. Candidatures supprimées et users OK`);
  } else {
    logger.warn(`7. Incohérences d'utilisateurs de candidatures supprimées : ${JSON.stringify(userSupprimesKO)}`);
  }

  // 8. Cohérence conseiller inexistant pour les candidatures supprimées
  const conseillerSupprimesKO = conseillersMongo.filter(id => candidaturesSupprimees.includes(id));

  if (conseillerSupprimesKO.length === 0) {
    logger.info(`8. Candidatures supprimées et conseillers OK`);
  } else {
    logger.warn(`8. Incohérences de conseillers de candidatures supprimées : ${JSON.stringify(conseillerSupprimesKO)}`);
  }

  // 9. Cohérence candidatures supprimées VS mises en relation
  let misesEnRelation = await getMisesEnRelation(db)(candidatsSupprimees.map(oid => new ObjectId(oid)));

  if (misesEnRelation.length === 0) {
    logger.info(`9. Mises en relation des candidatures supprimées OK`);
  } else {
    logger.warn(`9. Incohérences de mises en relation de candidatures supprimées : ${JSON.stringify(misesEnRelation)}`);
  }

  exit();
});
