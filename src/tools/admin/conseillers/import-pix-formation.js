#!/usr/bin/env node
'use strict';

const CSVToJSON = require('csvtojson');
const { execute } = require('../../utils');
const { program } = require('commander');

program
.option('-c, --csv <path>', 'CSV file path')
.option('-w, --whitelist <path>', 'CSV whitelist path');

program.parse(process.argv);

// Fichier xslx à convertir en csv en remplaçant les entêtes par : Prenom,Nom,Email,IdPG,Pix
// Prenom,Nom,Email,IdPG,Pix
// CSV PIX
const readCSV = async filePath => {
  try {
    // eslint-disable-next-line new-cap
    const conseillers = await CSVToJSON({ delimiter: 'auto' }).fromFile(filePath);
    return conseillers;
  } catch (err) {
    throw err;
  }
};

const getConseiller = db => async params => {
  return await db.collection('conseillers').findOne(params);
};

const insertCertificationFormationPix = db => async (idConseiller, query) => {
  return await db.collection('conseillers').updateOne({ _id: idConseiller }, query);
};

execute(__filename, async ({ db, logger }) => {

  const csvCertificationFormationPix = await readCSV(program.csv);
  let promises = [];
  let params = {};
  let i = 0;
  let e = 0;
  let c = 0;

  try {
    csvCertificationFormationPix.forEach(certification => {
      promises.push(new Promise(async resolve => {
        if (certification.IdPG !== 0) {
          params = {
            idPG: Number(certification.IdPG)
          };
        } else {
          params = {
            nom: String(certification.Nom),
            prenom: String(certification.Prenom),
            email: String(certification.Email),
          };
        }
        let query = {
          $set: {
            certificationPixFormation: certification.Pix.toLowerCase().trim() === 'oui',
          }
        };
        const conseiller = await getConseiller(db)(params);
        if (conseiller) {
          await insertCertificationFormationPix(db)(conseiller._id, query);
          c++;
        } else {
          logger.error('Conseiller introuvable avec les paramaètres suivant : {idPG:' +
          certification.IdPG + ', nom: ' + certification.Nom + ',prenom: ' + certification.Prenom + ' }');
          e++;
        }
        resolve();
      }));
      i++;
    });
    await Promise.all(promises);
  } catch (error) {
    logger.error(error);
  }

  logger.info(`[PIX] ${i} lignes au total`);
  logger.info(`[PIX] ${c} conseillers mis à jour`);
  logger.info(`[PIX] ${e} échecs`);
});
