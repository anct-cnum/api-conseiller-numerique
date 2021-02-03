#!/usr/bin/env node
'use strict';

const { execute } = require('../utils');
const { program } = require('commander');
const { Pool } = require('pg');
program.version('0.0.1');

program
.option('-l, --limit <limit>', 'Nombre de structures', 1);

program.parse(process.argv);

const pool = new Pool();

execute(async ({ feathers, db, logger, exit }) => {
  const moveStructure = async s => {
    logger.info(`Siret: ${s.siret}`);
    const match = await db.collection('structures').findOne({ idPG: s.id});
    if (!match) {
      const doc = {
        idPG: s.id,
        type: s.type,
        candidatIdentifie: s.has_candidate,
        dateDebutMission: s.start_date,
        nom: s.name,
        contactPrenom: s.contact_first_name,
        contactNom: s.contact_last_name,
        contactFonction: s.contact_job,
        contactEmail: s.contact_email,
        contactTelephone: s.contact_phone,
        codePostal: s.zip_code,
        location: s.location, // xxx stocker autre format lat long
        updated: s.updated,
        created: s.created,
        codeCommune: s.commune_code,
        codeDepartement: s.departement_code,
        nomGeo: s.geo_name, // xxx ???
        codeRegion: s.region_code,
        blocked: s.blocked,
        emailConfirmationKey: s.email_confirmation_key,
        emailConfirmed: s.email_confirmed,
        validated: s.validated,
        unsubscribeExtras: s.unsubscribe_extras,
        unsubscribed: s.unsubscribed,
        siret: s.siret,
        nombreConseillersSouhaites: s.coaches_requested,
        labelFranceService: s.labelFranceService,
        avis: '',
        commentaire: '' ,
        statut: 'CREEE',
      };

      const result = await db.collection('structures').insertOne(doc);
      logger.info(
        `${result.insertedCount} structures insérées avec _id: ${result.insertedId}`
      );
    }
  };

  const moveCandidat = async c => {
    console.dir(c);
    logger.info(`Candidat: ${c.name}`);

    const match = await db.collection('conseillers').findOne({ idPG: c.id});
    if (!match) {
      const doc = {
        idPG: c.id, // xxx Ajouter tous les champs
      };

      const result = await db.collection('conseillers').insertOne(doc);
      logger.info(
        `${result.insertedCount} conseillers insérés avec _id: ${result.insertedId}`
      );
    }
  };

  // Récupère toutes les structures dans PG
  const getStructures = async () => {
    try {
      const { rows } = await pool.query('SELECT * FROM djapp_hostorganization ORDER BY id ASC LIMIT $1',
        [program.limit]);
      return rows;
    } catch (error) {
      logger.info(`Erreur DB : ${error.message}`);
    }
  };

  // Récupère toutes les candidatures dans PG
  const getCandidats = async () => {
    try {
      const { rows } = await pool.query('SELECT * FROM djapp_coach ORDER BY id ASC LIMIT $1',
        [program.limit]);
      return rows;
    } catch (error) {
      logger.info(`Erreur DB : ${error.message}`);
    }
  };

  const structures = await getStructures();
  await logger.info(structures.length);
  for (let s of structures) {
    await moveStructure(s);
  }

  const candidats = await getCandidats();
  await logger.info(candidats.length);
  for (let c of candidats) {
    await moveCandidat(c);
  }
});

