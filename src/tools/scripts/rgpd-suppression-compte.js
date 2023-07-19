#!/usr/bin/env node
'use strict';

const { Pool } = require('pg');
const pool = new Pool();
const { execute } = require('../utils');
const { suppressionCv, candidatSupprimeEmailPix, deleteMailSib } = require('../../services/conseillers/conseillers.function');

const getCandidatsInactifs = db => async query =>
  await db.collection('conseillers').find(query).toArray();

const anonymisationCandidat = candidat => {
  // eslint-disable-next-line no-unused-vars
  const { email, telephone, nom, prenom, telephonePro, emailPro, supHierarchique, ...candidatASupprimer } = candidat;
  return candidatASupprimer;
};

const ajouterAuConseillersSupprimes = db => async candidatInactif => {
  await db.collection('conseillersSupprimes').insertOne({
    deletedAt: new Date(),
    motif: 'suppression automatique du candidat (RGPD)',
    conseiller: candidatInactif
  });
};

const deleteCandidatInactif = db => async candidatInactif => {
  await pool.query(`DELETE FROM djapp_coach WHERE id = $1`, [candidatInactif.idPG]);
  await db.collection('conseillers').deleteOne({ '_id': candidatInactif._id });
};

const deleteMeRCandidatInactif = db => async candidatInactif => {
  await pool.query(`DELETE FROM djapp_matching WHERE coach_id = $1`, [candidatInactif.idPG]);
  await db.collection('misesEnRelation').deleteMany({
    'conseiller.$id': candidatInactif._id
  });
};

execute(__filename, async ({ app, logger, db, Sentry }) => {

  const promises = [];
  const queryCandidatInactif = {
    $or: [
      // Cas 1 : compte inactif depuis 30 mois
      {
        inactivite: true,
      }
    ]
  };
  const candidatsInactifs = await getCandidatsInactifs(db)(queryCandidatInactif);

  candidatsInactifs?.forEach(candidatInactif => {
    const candidatASupprimer = anonymisationCandidat(candidatInactif);
    promises.push(new Promise(async resolve => {
      try {
        await ajouterAuConseillersSupprimes(db)(candidatASupprimer).then(async () => {
          return await deleteCandidatInactif(db)(candidatASupprimer);
        }).then(async () => {
          return await deleteMeRCandidatInactif(db)(candidatASupprimer);
        }).then(async () => {
          if (candidatASupprimer.cv?.file) {
            try {
              await suppressionCv(candidatASupprimer.cv, app);
            } catch (error) {
              logger.error(error);
              Sentry.captureException(error);
            }
          }
          return;
        }).then(async () => {
          await candidatSupprimeEmailPix(db, app)(candidatInactif);
          await deleteMailSib(app)(candidatInactif.email);
          return;
        });
      } catch (error) {
        logger.info(error);
        Sentry.captureException(error);
      }
      resolve();
    }));
  });
});
