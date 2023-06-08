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
  return user?.entity?.oid ? { id: user?.entity?.oid, nom: user?.nom, prenom: user?.prenom } : null;
};

const getIdSubordonneByMail = db => async emailConseiller => {
  const conseiller = await db.collection('conseillers').findOne({
    'emailCN.address': emailConseiller.replace(/\s/g, ''),
    'statut': 'RECRUTE'
  });
  return conseiller?._id ?? null;
};

const updateUserRole = db => async idConseiller => {
  await db.collection('users').updateOne(
    { 'entity.$id': idConseiller },
    { $set: { 'roles': ['coordinateur_coop', 'conseiller'] } }
  );
};

const updateConseillerIsCoordinateur = db => async idConseiller => {
  await db.collection('conseillers').updateOne(
    { '_id': idConseiller },
    { $set: { estCoordinateur: true } }
  );
  await db.collection('misesEnRelation').updateMany(
    { 'conseiller.$id': idConseiller },
    { $set: { 'conseillerObj.estCoordinateur': true } }
  );
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
  await db.collection('misesEnRelation').updateMany(
    { 'conseiller.$id': idConseiller },
    { $set: {
      'conseillerObj.estCoordinateur': true,
      'conseillerObj.listeSubordonnes': {
        'type': type, 'liste': list
      }
    } }
  );
};

const updateSubordonnes = db => async (coordinateur, list, type) => {
  const updateCnSubordonnes = db => async (match, queryUpdate) =>
    await db.collection('conseillers').updateMany({ statut: 'RECRUTE', ...match }, queryUpdate);
  // Maj du tag coordinateur dans le cas d'un changement de la liste custom ou autre (exemple coordo d'une region qui change en coordo departement)
  await updateCnSubordonnes(db)({ 'coordinateurs': { $elemMatch: { id: coordinateur.id } } }, { $pull: { 'coordinateurs': { id: coordinateur.id } } });
  switch (type) {
    case 'codeRegion':
      await updateCnSubordonnes(db)({ 'codeRegionStructure': { '$in': list } }, { $push: { 'coordinateurs': coordinateur } });
      break;
    case 'codeDepartement':
      await updateCnSubordonnes(db)({ 'codeDepartementStructure': { '$in': list } }, { $push: { 'coordinateurs': coordinateur } });
      break;
    default: // conseillers
      await updateCnSubordonnes(db)({ '_id': { '$in': list } }, { $push: { 'coordinateurs': coordinateur } }); // ok
      break;
  }
  await updateCnSubordonnes(db)({ 'coordinateurs.0': { $exists: false } }, { $unset: { 'coordinateurs': '' } });
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

  logger.info('Début de la création du rôle coordinateur_coop pour les conseillers du fichier d\'import.');
  await new Promise(resolve => {
    readCSV(program.csv).then(async ressources => {

      let ok = 0;
      let error = 0;
      const total = ressources.length;

      ressources.forEach(ressource => {
        let p = new Promise(async (resolve, reject) => {

          const adresseCoordo = ressource['Adresse CnFS'];
          const listCustom = ressource['Adresse mail CNFS'];
          const mailleRegional = ressource['Code région'];
          const mailleDepartement = ressource['Code département'];

          const estCoordinateur = await isAlreadyCoordinateur(db)(adresseCoordo);
          const coordinateur = await getIdConseillerByMail(db)(adresseCoordo);
          const idCoordinateur = coordinateur?.id;
          if (idCoordinateur) {
            if (!estCoordinateur) {
              await updateUserRole(db)(idCoordinateur);
            }

            let listMaille = [];

            if (mailleRegional.length > 0) {
              listMaille = mailleRegional.split('/');
              await addListSubordonnes(db)(idCoordinateur, listMaille, 'codeRegion');
              await updateSubordonnes(db)(coordinateur, listMaille, 'codeRegion');
            } else if (mailleDepartement.length > 0) {
              listMaille = mailleDepartement.split('/');
              await addListSubordonnes(db)(idCoordinateur, listMaille, 'codeDepartement');
              await updateSubordonnes(db)(coordinateur, listMaille, 'codeDepartement');
            } else if (listCustom.length > 0) {
              const emailsSubordonnes = listCustom.split('/');
              const promisesEmails = [];
              const idSubordonnes = [];
              emailsSubordonnes.forEach(email => {
                let p = new Promise(async (resolve, reject) => {
                  const idSubordonne = await getIdSubordonneByMail(db)(email.trim());
                  if (idSubordonne) {
                    idSubordonnes.push(idSubordonne);
                    resolve();
                  } else {
                    logger.error('Erreur : Le subordonné recruté avec l\'adresse email : ' + email + ' n\'existe pas !');
                    reject();
                  }
                });
                promisesEmails.push(p);
              });
              await Promise.allSettled(promisesEmails);

              //Maj avec la nouvelle liste des subordonnés directement (au cas où rupture entre temps par exemple)
              await addListSubordonnes(db)(idCoordinateur, idSubordonnes, 'conseillers');
              await updateSubordonnes(db)(coordinateur, idSubordonnes, 'conseillers');
            } else {
              await updateConseillerIsCoordinateur(db)(idCoordinateur);
            }
            ok++;
            resolve();
          } else {
            error++;
            logger.error('Erreur : Le coordinateur avec l\'adresse email : ' + adresseCoordo + ' n\'existe pas !');
            reject();
          }
          if (total === ok + error) {
            logger.info(`Fin de la création du rôle coordinateur_coop pour les conseillers du fichier d'import : ${ok} traité(s) & ${error} en erreur`);
            exit();
          }
        });
        promises.push(p);
      });
      resolve();
    }).catch(error => {
      logger.error(error);
      Sentry.captureException(error);
    });
  });

  await Promise.allSettled(promises);
  exit();
});
