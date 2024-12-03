#!/usr/bin/env node
'use strict';

const { execute } = require('../utils');
const { program } = require('commander');
const { Pool } = require('pg');

program
.option('-l, --limit <limit>', 'Nombre de structures', 1);

program.parse(process.argv);

const pool = new Pool();

execute(__filename, async ({ db, logger, Sentry }) => {
  const optionsScript = program.opts();
  const moveStructure = async s => {
    const filter = { idPG: s.id };

    const updateDoc = {
      $set: {
        'type': s.type,
        'nom': s.name,
        'siret': s.siret === null ? null : `${s.siret}`,
        'aIdentifieCandidat': s.has_candidate,
        'dateDebutMission': s.start_date,
        'contact.prenom': s.contact_first_name,
        'contact.nom': s.contact_last_name,
        'contact.fonction': s.contact_job,
        'contact.email': s.contact_email,
        'contact.telephone': s.contact_phone,
        'codePostal': s.zip_code,
        'location': s.location,
        'nomCommune': s.geo_name,
        'codeCommune': s.commune_code,
        'codeDepartement': s.departement_code === null ? null : `${s.departement_code}`,
        'codeRegion': s.region_code,
        'codeCom': s.com_code,
        'emailConfirmedAt': s.email_confirmed,
        'emailConfirmationKey': s.email_confirmation_key,
        'unsubscribedAt': s.unsubscribed, // "cliquez ici pour ne plus recevoir de propositions"
        'unsubscribeExtras': s.unsubscribe_extras, // JSON, pas utilisé
        'nombreConseillersSouhaites': s.coaches_requested,
        'coordinateurCandidature': s.wants_coordinators,
        'coordinateurTypeContrat': s.coordinator_type,
        'createdAt': s.created,
        'updatedAt': s.updated,
        'validatedAt': s.validated, // pas utilisé ?
        'deleted_at': s.blocked,
      },
      $setOnInsert: {
        idPG: s.id,
        statut: 'CREEE',
        estLabelliseFranceServices: 'NON',
        estZRR: null,
        prefet: [],
        coselec: [],
        userCreated: false,
        importedAt: new Date(),
      }
    };

    const options = { upsert: true };

    await db.collection('structures').updateOne(filter, updateDoc, options);

  };

  const moveCandidat = async c => {
    const filter = { idPG: c.id };

    const updateDoc = {
      $set: {
        prenom: c.first_name,
        nom: c.last_name,
        email: c.email.toLowerCase().trim(),
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
        codeCom: c.com_code,
        emailConfirmedAt: c.email_confirmed,
        emailConfirmationKey: c.email_confirmation_key,
        unsubscribedAt: c.unsubscribed,
        unsubscribeExtras: c.unsubscribe_extras, // JSON, pas utilisé
        createdAt: c.created,
        updatedAt: c.updated,
        deletedAt: c.blocked,
      },
      $setOnInsert: {
        idPG: c.id,
        importedAt: new Date(),
        userCreated: false,
      }
    };

    const options = { upsert: true };

    const inDeletion = await db.collection('conseillersSupprimes').countDocuments({ 'conseiller.idPG': c.id });
    if (inDeletion === 0) {
      await db.collection('conseillers').updateOne(filter, updateDoc, options);
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
          com_code,
          blocked,
          email_confirmation_key,
          email_confirmed,
          validated,
          unsubscribe_extras,
          unsubscribed,
          siret,
          coaches_requested,
          coordinator_type,
          wants_coordinators
        FROM djapp_hostorganization ORDER BY id ASC LIMIT $1`,
      [optionsScript.limit]);
      return rows;
    } catch (error) {
      logger.error(`Erreur DB : ${error.message}`);
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
          com_code,
          unsubscribe_extras,
          unsubscribed,
          disponible
        FROM djapp_coach ORDER BY id ASC LIMIT $1`,
      [optionsScript.limit]);
      return rows;
    } catch (error) {
      Sentry.captureException(error);
      logger.error(`Erreur DB : ${error.message}`);
    }
  };

  const structures = await getStructures();
  for (let s of structures) {
    await moveStructure(s);
  }

  const candidats = await getCandidats();
  for (let c of candidats) {
    await moveCandidat(c);
  }
});

