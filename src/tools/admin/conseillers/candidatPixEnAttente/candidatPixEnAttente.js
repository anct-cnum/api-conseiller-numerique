#!/usr/bin/env node
'use strict';

const CSVToJSON = require('csvtojson');
const { execute } = require('../../../utils');
const { program } = require('commander');
const sendCandidatPixEnAttenteEmail = require('./tasks/sendCandidatPixEnAttenteEmail');

program
.option('-c, --csv <path>', 'CSV file path')
.parse(process.argv);

// CSV PIX
const readCSV = async filePath => {
  try {
    // eslint-disable-next-line new-cap
    const users = await CSVToJSON({ delimiter: 'auto' }).fromFile(filePath);
    return users;
  } catch (err) {
    throw err;
  }
};

function removeAccentsRegex(string = '') {
  const reg = string.replace(/[á,à,ä,â]/g, 'a')
  .replace(/[A,Á,À,Ä,Â]/g, 'a')
  .replace(/[é,è,ê,ë]/g, 'e')
  .replace(/[E,É,È,Ê,Ë]/g, 'e')
  .replace(/[í,ï]/g, 'i')
  .replace(/[I,Í,Ï]/g, 'i')
  .replace(/[ÿ,Y,Ÿ]/g, 'y')
  .replace(/[ó,ö,ò,ô]/g, 'o')
  .replace(/[O,Ó,Ö,Ò,Ô]/g, 'o')
  .replace(/[ü,ú,ù]/g, 'u')
  .replace(/[U,Ü,Ú,Ù]/g, 'u')
  .replace(/[C,ç,Ç]/g, 'c')
  .replace(/[-]/g, '')
  .replace(/[\s]+/g, '');
  return reg;
}

function diacriticSensitiveRegex(string = '') {
  const reg = string.replace(/(.)/g, '$1[-]*\\s*')
  .replace(/a/g, '[a,á,à,ä,â,A,Á,À,Ä,Â]')
  .replace(/e/g, '[e,é,è,ê,ë,E,É,È,Ê,Ë]')
  .replace(/i/g, '[i,í,ï,I,Í,Ï]')
  .replace(/y/g, '[y,ÿ,Y,Ÿ]')
  .replace(/o/g, '[o,ó,ö,ò,ô,O,Ó,Ö,Ò,Ô]')
  .replace(/u/g, '[u,ü,ú,ù,U,Ü,Ú,Ù]')
  .replace(/c/g, '[c,C,ç,Ç]');
  return reg;
}

execute(__filename, async ({ logger, db, emails, Sentry }) => {

  let { delay = 1000 } = program.opts();
  let idCandidats = [];
  let j = 0;
  const pixUser = async pix => {
    try {
      // Chercher avec nom et prénom (ignorer casse et accents)
      let query = {
        '$or': [{
          nom: { $regex: diacriticSensitiveRegex(`^${removeAccentsRegex(pix.nom)}`), $options: 'i' },
          prenom: { $regex: diacriticSensitiveRegex(`^${removeAccentsRegex(pix.prenom)}`), $options: 'i' },
        }, {
          nom: { $regex: diacriticSensitiveRegex(`^${removeAccentsRegex(pix.prenom)}`), $options: 'i' },
          prenom: { $regex: diacriticSensitiveRegex(`^${removeAccentsRegex(pix.nom)}`), $options: 'i' },
        }]
      };
      const match = await db.collection('conseillers').findOne(query);
      if (match) {
        idCandidats.push(match._id);
        j++;
        logger.info(`OK;${match.nom};${match.prenom};${pix.nom};${pix.prenom};${pix.id};${match._id}`);
      } else {
        // Chercher avec l'id, et on logue
        const match = await db.collection('conseillers').findOne({ idPG: pix.id });
        if (match) {
          logger.info(`KO1;${match.nom};${match.prenom};${pix.nom};${pix.prenom};${pix.id}`);
        } else {
          logger.info(`KO2;${pix.nom};${pix.prenom};${pix.id}`);
        }
      }
    } catch (error) {
      logger.info(`Erreur DB : ${error.message}`);
    }
  };

  const pixUsers = await readCSV(program.csv);

  let i = 0;
  for (const user of pixUsers) {
    const nom = user['Nom du Participant'].replace(/\s/g, '');
    const prenom = user['Prénom du Participant'].replace(/\s/g, '');
    const id = ~~(user['identifiant CN'].replace(/\s/g, ''));
    const pourcentage = ~~(user['% de progression'].replace(/\s/g, ''));
    const partage = user['Partage (O/N)'].replace(/\s/g, '');

    i++;
    try {
      if (partage === 'Non' && pourcentage === 1) {
        await pixUser({ nom, prenom, id });
      }
    } catch (error) {
      logger.info(`KO ${error.message}`);
    }
  }

  logger.info('total de lignes: ' + i);
  logger.info('lignes validées: ' + j);

  try {
    let stats = await sendCandidatPixEnAttenteEmail(db, logger, emails, idCandidats, delay, Sentry);

    if (stats.total > 0) {
      logger.info(`[CONSEILLERS] Des emails sur le partage des résultats PIX ont été envoyés à des candidats : ` +
      `${stats.sent} envoyés / ${stats.error} erreurs`);
    }
    return stats;

  } catch (err) {
    logger.info(`[CONSEILLERS] Une erreur est survenue lors de l'envoi des emails sur le partage des résultats PIX aux candidats : ${err}`);
    Sentry.captureException(err);
    throw err;
  }
});
