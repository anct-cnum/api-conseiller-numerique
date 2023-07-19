#!/usr/bin/env node
'use strict';

const dayjs = require('dayjs');
const { S3Client, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const { execute } = require('../utils');

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
  await db.collection('conseillers').deleteOne({ '_id': candidatInactif._id });

};

const deleteMeRCandidatInactif = db => async candidatInactif => {
  await db.collection('misesEnRelation').deleteMany({
    'statut': { '$in': [
      'finalisee_non_disponible',
      'interessee',
      'nonInteressee',
      'non_disponible',
      'nouvelle',
      'nouvelle_rupture'
    ] },
    'conseiller.$id': candidatInactif._id
  });

  await db.collection('misesEnRelation').updateMany({
    'conseiller.$id': candidatInactif._id,
    'statut': { '$in': [
      'finalisee',
      'finalisee_rupture',
      'recrutee',
    ] },
  }, {
    $set: {
      conseillerObj: candidatInactif
    }
  });
};

const suppressionCv = async (cv, app, logger, Sentry) => {
  let promise;
  promise = new Promise(async (resolve, reject) => {
  //initialisation AWS
    const awsConfig = app.get('aws');
    const client = new S3Client({
      region: awsConfig.region,
      credentials: {
        accessKeyId: awsConfig.access_key_id,
        secretAccessKey: awsConfig.secret_access_key,
      },
      endpoint: awsConfig.endpoint,
    });

    //Suppression du fichier CV
    let paramsDelete = { Bucket: awsConfig.cv_bucket, Key: cv?.file };
    const command = new DeleteObjectCommand(paramsDelete);
    await client.send(command).then(async data => {
      resolve(data);
    }).catch(error => {
      logger.info(error);
      Sentry.captureException(error);
      reject(error);
    });
  });
  await promise;
};

execute(__filename, async ({ app, logger, db, Sentry }) => {

  const promises = [];
  const delayDefault = 30;
  const EXPIRATION_DATE_DEFAUT = new Date(dayjs(new Date()).subtract(parseInt(delayDefault), 'month')); // RGPD 30 mois

  const queryCandidatInactif = {
    $or: [
      // Cas 1 : compte inactif depuis 30 mois
      {
        inactivite: true,
      },
      // Cas 2 : compte inactif depuis 30 mois, mais ne porte pas le flag
      {
        userCreated: false,
        disponibilite: false,
        updatedAt: { $lte: EXPIRATION_DATE_DEFAUT }
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
              await suppressionCv(candidatASupprimer.cv, app, logger, Sentry);
            } catch (error) {
              logger.error(error);
              Sentry.captureException(error);
            }
          }
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
