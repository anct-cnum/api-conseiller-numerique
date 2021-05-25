#!/usr/bin/env node
'use strict';

const { program } = require('commander');
const { Pool } = require('pg');
const { ObjectID } = require('mongodb');

const { execute } = require('../../../utils');

const pool = new Pool();

execute(__filename, async ({ db, logger, emails, exit }) => {
  const getStructure = async id => {
    try {
      const { rows } = await pool.query(`
        SELECT
          id,
          name,
          contact_first_name,
          contact_last_name,
          contact_job,
          contact_email,
          contact_phone,
          siret
        FROM djapp_hostorganization
        WHERE id = $1`,
      [id]);
      return rows;
    } catch (error) {
      logger.info(`Erreur DB : ${error.message}`);
    }
  };

  const updateStructurePG = async (id, contact) => {
    try {
      const { rows } = await pool.query(`
        UPDATE djapp_hostorganization
        SET (
          contact_first_name,
          contact_last_name,
          contact_job,
          contact_email,
          contact_phone)
          =
          ($2,$3,$4,$5,$6)
        WHERE id = $1`,
      [id, contact.first_name,
        contact.last_name,
        contact.job,
        contact.email,
        contact.phone]);
      return rows;
    } catch (error) {
      logger.info(`Erreur DB : ${error.message}`);
    }
  };

  program.option('-e, --email <email>', 'email: nouvelle adresse email pour la structure');
  program.option('-n, --nom <nom>', 'nom: nom du nouveau contact');
  program.option('-p, --prenom <prenom>', 'prenom: prénom du nouveau contact');
  program.option('-f, --fonction <fonction>', 'fonction: fonction du nouveau contact');
  program.option('-t, --telephone <telephone>', 'telephone: téléphone du nouveau contact');
  program.option('-m, --invitation', `invitation: envoie lemail d'invitation`);
  program.option('-i, --id <id>', 'id: id PG de la structure');
  program.helpOption('-e', 'HELP command');
  program.parse(process.argv);

  let id = ~~program.id;
  let email = program.email;

  if (id === 0 || !email) {
    exit('Paramètres invalides. Veuillez préciser un id et une adresse email');
    return;
  }

  const structures = await db.collection('structures').find({ idPG: id }).toArray();

  if (structures.length === 0) {
    exit('id PG inconnu dans MongoDB');
    return;
  }

  const structuresPG = await getStructure(id);

  if (!structuresPG || structuresPG.length === 0) {
    exit('id PG inconnu dans PostgreSQL');
    return;
  }
  const structurePG = structuresPG[0];

  let contact = {};
  contact.first_name = program.prenom || structurePG.contact_first_name;
  contact.last_name = program.nom || structurePG.contact_last_name;
  contact.job = program.fonction || structurePG.contact_job;
  contact.email = program.email || structurePG.contact_email;
  contact.phone = program.telephone || structurePG.contact_phone;

  updateStructurePG(id, contact);

  await db.collection('structures').updateOne({ idPG: id }, { $set: {
    contact: {
      prenom: contact.first_name,
      nom: contact.last_name,
      fonction: contact.job,
      email: contact.email,
      telephone: contact.phone
    } } }, {});

  const structure = await db.collection('structures').findOne({ idPG: id});

  await db.collection('users').updateOne({ name: structurePG.contact_email, 'entity.$id' : new ObjectID(structure._id) }, { $set: {
    name: contact.email } }, {});

  const structureUser = await db.collection('users').findOne({ 'entity.$id' : new ObjectID(structure._id) });

  if (program.invitation) {
    let message = emails.getEmailMessageByTemplateName('creationCompteStructure');
    await message.send(structureUser);
    logger.info('Invitation envoyée');
  }

  exit('Email mis à jour');
});
