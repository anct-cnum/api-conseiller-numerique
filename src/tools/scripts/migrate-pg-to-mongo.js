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
    logger.info(`Location: ${JSON.stringify(s.location)}`);
    const match = await db.collection('structures').findOne({ idPG: s.id});
    //const match = await db.collection('structures').findOne({ siret: s.siret});
    if (!match) {
      const doc = {
        idPG: s.id,
        type: s.type,
        statut: 'CREEE',
        nom: s.name,
        siret: '' + s.siret,
        aIdentifieCandidat: s.has_candidate,
        dateDebutMission: s.start_date,
        nombreConseillersSouhaites: 0,
        estLabelliseFranceServices: false,
        avisPrefet: '',
        commentairePrefet: '' ,
        nombreConseillersPrefet: 0,
        contactPrenom: s.contact_first_name,
        contactNom: s.contact_last_name,
        contactFonction: s.contact_job,
        contactEmail: s.contact_email,
        contactTelephone: s.contact_phone,
        codePostal: s.zip_code,
        location: s.location,
        nomCommune: s.geo_name,
        codeCommune: s.commune_code,
        codeDepartement: '' + s.departement_code,
        codeRegion: s.region_code,
        emailConfirmedAt: s.email_confirmed,
        emailConfirmationKey: s.email_confirmation_key,
        unsubscribedAt: s.unsubscribed, // "cliquez ici pour ne plus recevoir de propositions"
        unsubscribeExtras: s.unsubscribe_extras, // JSON, pas utilisé
        createdAt: s.created,
        updatedAt: s.updated,
        validatedAt: s.validated, // pas utilisé ?
        importedAt: new Date(),
        deleted_at: s.blocked,
      };

      const result = await db.collection('structures').insertOne(doc);
      logger.info(
        `${result.insertedCount} structures insérées avec _id: ${result.insertedId}`
      );
    }
  };

  const moveCandidat = async c => {
    logger.info(`Candidat: ${c.first_name} ${c.last_name}`);

    const match = await db.collection('conseillers').findOne({ idPG: c.id});
    if (!match) {
      const doc = {
        idPG: c.id,
        prenom: c.first_name,
        nom: c.last_name,
        email: c.email,
        telephone: c.phone,
        distanceMax: c.max_distance,
        disponible: c.disponible,
        dateDisponibilite: c.start_date,
        estDemandeurEmploi: c.situation_looking,
        estEnEmploi: c.situation_job,
        estEnFormation: c.situation_learning,
        estDiplomeMedNum: c.situation_graduated,
        nomDiplomeMedNum: c.formation,
        aUneExperienceMedNum: c.has_experience,
        codePostal: c.zip_code,
        location: c.location,
        nomCommune: c.geo_name,
        codeCommune: c.commune_code,
        codeDepartement: c.departement_code,
        codeRegion: c.region_code,
        emailConfirmedAt: c.email_confirmed,
        emailConfirmationKey: c.email_confirmation_key,
        unsubscribedAt: c.unsubscribed,
        unsubscribeExtras: c.unsubscribe_extras, // JSON, pas utilisé
        createdAt: c.created,
        updatedAt: c.updated,
        importedAt: new Date(),
        deletedAt: c.blocked,
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
      const { rows } = await pool.query(`
        SELECT
          id,
          type,
          has_candidate,
          start_date,
          name,
          contact_first_name,
          contact_last_name,
          contact_job,
          contact_email,
          contact_phone,
          zip_code,
          ST_AsGeoJSON(ST_Transform(location::geometry, 4326),15,0)::json AS location,
          updated,
          created,
          commune_code,
          departement_code,
          geo_name,
          region_code,
          blocked,
          email_confirmation_key,
          email_confirmed,
          validated,
          unsubscribe_extras,
          unsubscribed,
          siret,
          coaches_requested
        FROM djapp_hostorganization ORDER BY id ASC LIMIT $1`,
        [program.limit]);
      return rows;
    } catch (error) {
      logger.info(`Erreur DB : ${error.message}`);
    }
  };

  // Récupère toutes les candidatures dans PG
  const getCandidats = async () => {
    try {
      const { rows } = await pool.query(`
        SELECT
          id,
          situation_looking,
          situation_job,
          situation_learning,
          situation_graduated,
          formation,
          has_experience,
          zip_code,
          max_distance,
          start_date,
          first_name,
          last_name,
          email,
          phone,
          ST_AsGeoJSON(ST_Transform(location::geometry, 4326),15,0)::json AS location,
          updated,
          created,
          email_confirmed,
          email_confirmation_key,
          blocked,
          commune_code,
          departement_code,
          geo_name,
          region_code,
          unsubscribe_extras,
          unsubscribed,
          disponible
        FROM djapp_coach ORDER BY id ASC LIMIT $1`,
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

