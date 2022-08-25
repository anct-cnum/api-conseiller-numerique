const {
  createUser,
  getCnfsRecrute,
  getValidationStructure,
  getCnfsNonRecrute
} = require('./requete-mongo');
const { DBRef } = require('mongodb');
const fakeData = require('./fake-data');
const { v4: uuidv4 } = require('uuid');

const state = {
  tokenCreatedAt: new Date(),
  mailSentDate: null,
  passwordCreated: true,
  createdAt: new Date(),
};

const createCompteFixPrefetDepartement = async (db, logger, password) => {
  const body = {
    name: `departement.44@prefet.fr`,
    roles: Array('prefet'),
    departement: '44',
    password: password,
    token: uuidv4(),
    ...state
  };
  await createUser(db)(body);
  logger.info(`Insert => ${body.name}`);
};
const createCompteFixPrefetRegion = async (db, logger, password) => {
  const body = {
    name: `region.11@prefet.fr`,
    roles: Array('prefet'),
    password: password,
    region: '11',
    token: uuidv4(),
    ...state
  };
  await createUser(db)(body);
  logger.info(`Insert => ${body.name}`);
};

const createCompteFixAdmin = async (db, logger, password) => {
  const body = {
    name: `admin-prenium@admin.fr`,
    roles: ['admin', 'admin_coop'],
    password: password,
    token: uuidv4(),
    ...state
  };
  await createUser(db)(body);
  logger.info(`Insert => ${body.name}`);
};
const createCompteFixCandidat = async (db, logger, password, database) => {
  const { _id, nom, prenom } = await getCnfsNonRecrute(db);
  const body = {
    name: `${prenom}.${nom}@candidat.fr`.toLowerCase(),
    nom,
    prenom,
    roles: Array('candidat'),
    entity: new DBRef('conseillers', _id, database),
    password: password,
    token: uuidv4(),
    ...state
  };
  await createUser(db)(body);
  logger.info(`Insert => ${body.name}`);
};
const createCompteFixCnfs = async (db, logger, password, database) => {
  const { _id, nom, prenom } = await getCnfsRecrute(db);
  const body = {
    name: `${prenom}.${nom}@beta.cnfs.fr`.toLowerCase(),
    nom,
    prenom,
    roles: Array('conseiller'),
    entity: new DBRef('conseillers', _id, database),
    password: password,
    token: uuidv4(),
    ...state
  };
  await createUser(db)(body);
  logger.info(`Insert => ${body.name}`);
};
const createCompteFixCnfsCoordo = async (db, logger, password, database) => {
  const { _id, nom, prenom } = await getCnfsRecrute(db);
  const body = {
    name: `recette-cnfs-coordo@beta.cnfs.fr`,
    nom,
    prenom,
    roles: ['coordinateur_coop', 'conseiller'],
    entity: new DBRef('conseillers', _id, database),
    password: password,
    token: uuidv4(),
    ...state
  };
  await createUser(db)(body);
  logger.info(`Insert => ${body.name}`);
};
const createCompteFixStructure = async (db, logger, password, database) => {
  const structureValider = await getValidationStructure(db);
  const body = {
    name: `sa@structure.fr`,
    roles: ['structure', 'structure_coop'],
    entity: new DBRef('structures', structureValider._id, database),
    password: password,
    token: uuidv4(),
    ...state
  };
  await createUser(db)(body);
  logger.info(`Insert => ${body.name}`);
};
const createCompteFixCHub = async (db, logger, password) => {
  const fake = await fakeData({});
  const body = {
    name: `beta-hub@Hinaura.fr`,
    roles: Array('hub_coop'),
    nom: fake.nom,
    prenom: fake.prenom,
    hub: 'Hinaura',
    password: password,
    token: uuidv4(),
    ...state
  };
  await createUser(db)(body);
  logger.info(`Insert => ${body.name}`);
};
module.exports = {
  createCompteFixPrefetDepartement,
  createCompteFixPrefetRegion,
  createCompteFixAdmin,
  createCompteFixCandidat,
  createCompteFixCnfs,
  createCompteFixCnfsCoordo,
  createCompteFixStructure,
  createCompteFixCHub,
};
