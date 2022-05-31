#!/usr/bin/env node
'use strict';

const { execute } = require('../../utils');
const { program } = require('commander');
const CSVToJSON = require('csvtojson');

const getIdConseillerByMail = db => async emailConseiller => {
  const user = await db.collection('users').findOne({
    'name': emailConseiller
  });
  return user?.entity?.oid;
};

const updateUserConseiller = db => async idConseiller => {
  await db.collection('users').updateOne(
    { 'entity.$id': idConseiller },
    { $set: { 'roles': ['conseiller', 'coordinateur_coop'] } }
  );
};

const addListSubordonnes = db => async (idConseiller, list, type) => {
  await db.collection('conseillers').updateOne(
    { '_id': idConseiller },
    { $set: { 'liste_subordonnes':
      {
        'type': type, 'liste': list
      }
    } }
  );
};

// CSV importé
const readCSV = async filePath => {
  try {
    // eslint-disable-next-line new-cap
    const lines = await CSVToJSON({ delimiter: ';' }).fromFile(filePath);
    return lines;
  } catch (err) {
    throw err;
  }
};

program.option('-c, --csv <path>', 'CSV file path');

program.parse(process.argv);

execute(__filename, async ({ db, logger, exit, Sentry }) => {
  let promises = [];

  try {
    await readCSV(program.csv).then(async ressources => {
      ressources.forEach(ressource => {
        promises.push(new Promise(async resolve => {
          const idCoordinateur = await getIdConseillerByMail(db)(ressource.conseiller);
          if (idCoordinateur) {

            console.log(ressource.conseiller + ' ---> ' + idCoordinateur);
            await updateUserConseiller(db)(idCoordinateur);
            /*if (ressource.region.length > 0) {
              await addListSubordonnes(db)(idCoordinateur, ressource.region, 'codeRegion');
            } else if (ressource.departement.length > 0) {
              await addListSubordonnes(db)(idCoordinateur, ressource.departement, 'codeDepartement');
            } else if (ressource.emails.length > 0) {
              const emailsSubordonnes = ressource.emails.split(',');
              const idsSubordonnes = [];
              emailsSubordonnes.forEach(email => {
                const idSubordonne = await getIdConseillerByMail(db)(email);
                idsSubordonnes.push(idSubordonne);
              });
              await addListSubordonnes(db)(idCoordinateur, ressource.departement, 'codeDepartement');
            }*/
          } else {
            logger.error('Erreur : Le coordinateur avec l\'adresse email : ' + ressource.conseiller + 'n\'existe pas !');
          }
          resolve();
        }));
      });

      await Promise.all(promises);
    });
  } catch (error) {
    logger.error(error);
  }


  /*
  file.close();
    try {
      let promises = [];
      await Promise.all(promises);
      await logger.info(nbCordinateurs + ' coordinateur ont été créés.');
    } catch (error) {
      logger.error(error);
      Sentry.captureException(error);
    }*/

  await logger.info('Fin de la création du rôle coordinateur_coop pour les conseillers du fichier d\'import.');
  exit();
});
