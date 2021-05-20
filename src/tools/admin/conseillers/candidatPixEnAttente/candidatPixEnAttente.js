#!/usr/bin/env node
'use strict';

const CSVToJSON = require('csvtojson');
const { execute } = require('../../../utils');
const { program } = require('commander');

program
.option('-c, --csv <path>', 'CSV file path');

program.parse(process.argv);

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
  const reg = string.replace(/[á,à,ä]/g, 'a')
  .replace(/[é,è,ê,ë]/g, 'e')
  .replace(/[í,ï]/g, 'i')
  .replace(/[ó,ö,ò]/g, 'o')
  .replace(/[ü,ú,ù]/g, 'u');
  //console.log(reg);
  return reg;
}

function diacriticSensitiveRegex(string = '') {
  const reg = string.replace(/a/g, '[a,á,à,ä]')
  .replace(/e/g, '[e,é,è,ê,ë]')
  .replace(/i/g, '[i,í,ï]')
  .replace(/o/g, '[o,ó,ö,ò]')
  .replace(/u/g, '[u,ü,ú,ù]');
  //console.log(reg);
  return reg;
}

execute(__filename, async ({ logger, db, app, emails, Sentry }) => {

  let conseillers = [];
  let j = 0;
  const pixUser = async pix => {
    try {
      // 1- Chercher avec nom et prénom (ignorer casse et accents)
      const match = await db.collection('conseillers').findOne({
        nom: { $regex: new RegExp(diacriticSensitiveRegex(`^${removeAccentsRegex(pix.nom)}`)), $options: 'i' },
        prenom: { $regex: new RegExp(diacriticSensitiveRegex(`^${removeAccentsRegex(pix.prenom)}`)), $options: 'i' },
      });
      if (match) {
        logger.info(`OK;${match.nom};${match.prenom};${pix.nom};${pix.prenom};${pix.id};${match._id}`);
      } else {
        // 2- Chercher avec l'id, et on logue
        const match = await db.collection('conseillers').findOne({ idPG: pix.id });
        if (match) {
          conseillers.push(match);
          logger.info(`KO1;${match.nom};${match.prenom};${pix.nom};${pix.prenom};${pix.id}`);
        } else {
          logger.info(`KO2;${pix.nom};${pix.prenom};${pix.id}`);
        }
        j++;
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
    //const email = reply['Adresse email'];

    i++;
    logger.info(nom + ' ' + prenom + ' ' + partage + ' ' + pourcentage);
    try {
      if (partage === 'Non' && pourcentage === 1) {
        await pixUser({
          nom: nom,
          prenom: prenom,
          id: id,
        });
      }
    } catch (error) {
      logger.info(`KO ${error.message}`);
    }
  }
  console.log(conseillers);
  logger.info(i);
  logger.info(j);
});


/*
const cli = require('commander');
const CSVToJSON = require('csvtojson');
const { execute, capitalizeFirstLetter } = require('../../../../utils');
//const sendCandidatPixEnAttenteEmail = require('./tasks/sendCandidatPixEnAttenteEmail');
const _ = require('lodash');

cli.description('Send point recrutment to candidate emails')
.option('--type [type]', 'resend,send (default: send))', capitalizeFirstLetter)
.option('--delay [delay]', 'Time in milliseconds to wait before sending the next email (default: 100)', parseInt)
.option('--limit [limit]', 'limit the number of emails sent (default: 1)', parseInt)
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
  const reg = string.replace(/[á,à,ä]/g, 'a')
  .replace(/[é,è,ê,ë]/g, 'e')
  .replace(/[í,ï]/g, 'i')
  .replace(/[ó,ö,ò]/g, 'o')
  .replace(/[ü,ú,ù]/g, 'u');
  //console.log(reg);
  return reg;
}

function diacriticSensitiveRegex(string = '') {
  const reg = string.replace(/a/g, '[a,á,à,ä]')
  .replace(/e/g, '[e,é,è,ê,ë]')
  .replace(/i/g, '[i,í,ï]')
  .replace(/o/g, '[o,ó,ö,ò]')
  .replace(/u/g, '[u,ü,ú,ù]');
  //console.log(reg);
  return reg;
}
/*
execute(__filename, async ({ logger, db, app, emails, Sentry }) => {
  let { type = 'send', delay = 100, limit = 1000 } = cli;
  let ActionClass = require(`./tasks/actions/${_.capitalize(type)}Action`);
  let action = new ActionClass(app);
  const pixUsers = await readCSV(cli.csv);
  let j = 0;
  let i = 0;
  let conseillers = [];

  logger.info('Envoi de l\'email de relance du partage des résultats PIX des candidats...');

  const pixUser = async pix => {
    try {
      // Chercher avec nom et prénom (ignorer casse et accents)
      const match = await db.collection('conseillers').findOne({
        nom: { $regex: new RegExp(diacriticSensitiveRegex(`^${removeAccentsRegex(pix.nom)}`)), $options: 'i' },
        prenom: { $regex: new RegExp(diacriticSensitiveRegex(`^${removeAccentsRegex(pix.prenom)}`)), $options: 'i' },
      });
      if (match) {
        conseillers.push(match);
        logger.info(`OK;${match.nom};${match.prenom};${pix.nom};${pix.prenom};${pix.id};${match._id}`);
      } else {
      // Chercher avec l'id, et on logue
        const match = await db.collection('conseillers').findOne({ idPG: pix.id });
        if (match) {
          logger.info(`KO1;${match.nom};${match.prenom};${pix.nom};${pix.prenom};${pix.id}`);
        } else {
          logger.info(`KO2;${pix.nom};${pix.prenom};${pix.id}`);
        }
        j++;
      }
      console.log(match);
    } catch (error) {
      logger.info(`Erreur DB : ${error.message}`);
    }
  };

  for (const user of pixUsers) {
    const nom = user['Nom du Participant'].replace(/\s/g, '');
    const prenom = user['Prénom du Participant'].replace(/\s/g, '');
    const partage = user['Partage (O/N)'].replace(/\s/g, '');
    //const email = user['Adresse email'];

    i++;
    //logger.info(nom + ' ' + prenom + ' ' + partage + ' ' + partage);
    try {
      if (partage === 'Non') {
        await pixUser({
          nom: nom,
          prenom: prenom
        });
      }
    } catch (error) {
      logger.info(`KO ${error.message}`);

    }
  }
  console.log(conseillers);
  logger.info(i);
  logger.info(j);

}, { slack: cli.slack });


*/


/*


  try {
    let stats = await sendCandidatPixEnAttenteEmail(db, logger, emails, action, {
      limit,
      delay,
    }, Sentry);

    if (stats.total > 0) {
      logger.info(`[CONSEILLERS] Des emails sur le partage des résultats PIX ont été envoyés à des candidats : ` +
      `${stats.sent} envoyés / ${stats.error} erreurs`);
    }

    return stats;
  } catch (err) {
    logger.info(`[CONSEILLERS] Une erreur est survenue lors de l'envoi des emails sur le partage des résultats PIX aux candidats : ` +
    `${err}`);
    Sentry.captureException(err);
    throw err;
  }

*/
