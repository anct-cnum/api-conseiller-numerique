#!/usr/bin/env node
'use strict';

const { execute } = require('../../utils');
const { program } = require('commander');
const CSVToJSON = require('csvtojson');

const isAlreadyCoordinateur = db => async emailConseiller => {
  const user = await db.collection('users').findOne({
    'name': emailConseiller.replace(/\s/g, ''),
    'roles': { '$in': ['coordinateur_coop'] }
  });
  return Boolean(user);
};

const getIdConseillerByMail = db => async emailConseiller => {
  const user = await db.collection('users').findOne({
    'name': emailConseiller.replace(/\s/g, ''),
    'roles': { '$in': ['conseiller'] }
  });
  return user?.entity?.oid ?? null;
};

const updateUserRole = db => async idConseiller => {
  await db.collection('users').updateOne(
    { 'entity.$id': idConseiller },
    { $set: { 'roles': ['conseiller', 'coordinateur_coop'] } }
  );
};

const getListeExistante = db => async idConseiller => {
  const conseiller = await db.collection('conseillers').findOne({
    '_id': idConseiller
  });
  return conseiller?.listeSubordonnes?.liste ?? [];
};

const addListSubordonnes = db => async (idConseiller, list, type) => {
  await db.collection('conseillers').updateOne(
    { '_id': idConseiller },
    { $set: {
      'estCoordinateur': true,
      'listeSubordonnes': {
        'type': type, 'liste': list
      }
    } }
  );
};

const setListeFinale = (listeFile, listeExistante) => {
  let listFinale = [];
  listeFile.forEach(element => {
    let isPush = true;
    //forEach car includes ne fonctionne pas sur les ObjectId
    listeExistante.forEach(existant => {
      if (String(existant) === String(element)) {
        isPush = false;
      }
    });
    if (isPush) {
      listFinale.push(element);
    }
  });
  return listFinale.concat(listeExistante);
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
  let sendEmailTo = [];

  logger.info('Début de la création du rôle coordinateur_coop pour les conseillers du fichier d\'import.');
  await new Promise(resolve => {
    readCSV(program.csv).then(async ressources => {
      ressources.forEach(ressource => {
        let p = new Promise(async (resolve, reject) => {
          const estCoordinateur = await isAlreadyCoordinateur(db)(ressource.conseiller);
          const idCoordinateur = await getIdConseillerByMail(db)(ressource.conseiller);

          if (idCoordinateur) {
            if (!estCoordinateur) {
              await updateUserRole(db)(idCoordinateur);
              sendEmailTo.push(ressource.conseiller.replace(/\s/g, ''));
            }

            let listeExistante = await getListeExistante(db)(idCoordinateur);

            let listFinale = [];
            if (ressource.region.length > 0) {
              listFinale = setListeFinale(ressource.region.split(','), listeExistante);
              await addListSubordonnes(db)(idCoordinateur, listFinale, 'codeRegion');
            } else if (ressource.departement.length > 0) {
              listFinale = setListeFinale(ressource.departement.split(','), listeExistante);
              await addListSubordonnes(db)(idCoordinateur, listFinale, 'codeDepartement');
            } else if (ressource.emails.length > 0) {
              const emailsSubordonnes = ressource.emails.split(',');
              const promisesEmails = [];
              const idSubordonnes = [];
              emailsSubordonnes.forEach(email => {
                let p = new Promise(async (resolve, reject) => {
                  const idSubordonne = await getIdConseillerByMail(db)(email);
                  if (idSubordonne) {
                    idSubordonnes.push(idSubordonne);
                    resolve();
                  } else {
                    logger.error('Erreur : Le conseiller avec l\'adresse email : ' + email + ' n\'existe pas !');
                    reject();
                  }
                });
                promisesEmails.push(p);
              });
              await Promise.allSettled(promisesEmails);

              listFinale = setListeFinale(idSubordonnes, listeExistante);
              await addListSubordonnes(db)(idCoordinateur, listFinale, 'conseillers');
            }

            resolve();
          } else {
            logger.error('Erreur : Le coordinateur avec l\'adresse email : ' + ressource.conseiller + ' n\'existe pas !');
            reject();
          }
        });
        promises.push(p);
      });

    }).catch(error => {
      logger.error(error);
      Sentry.captureException(error);
    });
    resolve();
  });

  await Promise.allSettled(promises);

  logger.info('Fin de la création du rôle coordinateur_coop pour les conseillers du fichier d\'import.');
  exit();
});
