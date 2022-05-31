#!/usr/bin/env node
'use strict';

const { execute } = require('../../utils');
const { program } = require('commander');
const CSVToJSON = require('csvtojson');

const getIdConseillerByMail = db => async emailConseiller => {
  const user = await db.collection('users').findOne({
    'name': emailConseiller.replace(/\s/g, '')
  });
  return user?.entity?.oid ?? null;
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
    { $set: { 'listeSubordonnes':
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
            let updatePromises = [];

            updatePromises.push(new Promise(async resolve => {
              await updateUserConseiller(db)(idCoordinateur);

              let addListPromises = [];

              addListPromises.push(new Promise(async resolve => {

                if (ressource.region.length > 0) {
                  await addListSubordonnes(db)(idCoordinateur, ressource.region.split(','), 'codeRegion');
                } else if (ressource.departement.length > 0) {
                  await addListSubordonnes(db)(idCoordinateur, ressource.departement.split(','), 'codeDepartement');
                } else if (ressource.emails.length > 0) {
                  const emailsSubordonnes = ressource.emails.split(',');
                  const idsSubordonnes = [];
                  let idConseillerPromises = [];

                  emailsSubordonnes.forEach(email => {
                    idConseillerPromises.push(new Promise(async resolve => {
                      const idSubordonne = await getIdConseillerByMail(db)(email);
                      if (idSubordonne) {
                        idsSubordonnes.push(idSubordonne);
                      } else {
                        logger.error('Erreur : Le conseiller avec l\'adresse email : ' + email + ' n\'existe pas !');
                      }
                      resolve();
                    }));
                  });

                  await Promise.all(idConseillerPromises);

                  await addListSubordonnes(db)(idCoordinateur, idsSubordonnes, 'conseillers');
                }
                resolve();

                await Promise.all(addListPromises);
              }));
              resolve();
            }));

            await Promise.all(updatePromises);
          } else {
            logger.error('Erreur : Le coordinateur avec l\'adresse email : ' + ressource.conseiller + ' n\'existe pas !');
          }
          resolve();
        }));
      });

      await Promise.all(promises);

      await logger.info('Fin de la création du rôle coordinateur_coop pour les conseillers du fichier d\'import.');
    });
  } catch (error) {
    logger.error(error);
    Sentry.captureException(error);
  }

  exit();
});
