#!/usr/bin/env node
'use strict';

const axios = require('axios');
const CSVToJSON = require('csvtojson');
const { Pool } = require('pg');
const { execute } = require('../../utils');
const { program } = require('commander');

program
  .option('-t, --token <token>', 'token api entreprise')
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

execute(async ({ db, logger }) => {
  let j=0;
  const insertPix = async pix => {
    try {
      // 1- Chercher avec nom et prénom (ignorer casse et accents)
      // Si ça match, on stocke
      const match = await db.collection('conseillers').findOne({
        nom : { $regex: new RegExp(diacriticSensitiveRegex(`^${removeAccentsRegex(pix.nom)}`)), $options: "i" },
        prenom : { $regex: new RegExp(diacriticSensitiveRegex(`^${removeAccentsRegex(pix.prenom)}`)), $options: "i" },
      });

//      const match = await db.collection('conseillers').findOne({
//        $text: { $search: `${pix.nom} ${pix.prenom}`, $caseSensitive: true }
//      });
      if (match) {
        logger.info(`OK;${match.nom};${match.prenom};${pix.nom};${pix.prenom};${pix.id};${match._id}`);
        //if (!new RegExp(`^${pix.nom}`, 'i').test(match.nom) || !new RegExp(`^${pix.prenom}`, 'i').test(match.prenom)) console.log(` no Match ! ${match.nom} ${match.prenom} ${match.idPG} ${pix.nom} ${pix.prenom} ${pix.id}`);

        // Import dans Mongo

        //logger.info(JSON.stringify(match));

        const filter = {
          '_id': match._id,
        };

        const updateDoc = {
          $set: {
            pix: {
              partage: pix.partage === 'Oui',
              datePartage: new Date(pix.datePartage),
              palier: ~~pix.palier,
              competence1: pix.competence1 === 'Oui',
              competence2: pix.competence2 === 'Oui',
              competence3: pix.competence3 === 'Oui',
            },
          }
        };

        const options = { };

        await db.collection('conseillers').updateOne(filter, updateDoc, options);
      } else {
        // 2- Chercher avec l'id, et on logue
        const match = await db.collection('conseillers').findOne({ idPG: pix.id });
        if (match) {
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

  const replies = await readCSV(program.csv);

  let i=0;
  for (const reply of replies) {
    const nom = reply['Nom du Participant'].replace(/\s/g, '');
    const prenom = reply['Prénom du Participant'].replace(/\s/g, '');
    const id = ~~(reply['identifiant CN'].replace(/\s/g, ''));
    const partage = reply['Partage (O/N)'].replace(/\s/g, '');
    const datePartage = reply['Date du partage'].replace(/\s/g, '');
    const palier = reply['Palier obtenu (/3)'].replace(/\s/g, '');
    const competence1 = reply['Utilisation du numérique dans la vie professionnelle obtenu (O/N)'].replace(/\s/g, '');
    const competence2 = reply['Production de ressources obtenu (O/N)'].replace(/\s/g, '');
    const competence3 = reply['Compétences numériques en lien avec la e-citoyenneté obtenu (O/N)'].replace(/\s/g, '');
    //const email = reply['Adresse email'];

    i++;
    //logger.info(nom + ' ' + prenom + ' ' + partage + ' ' + palier);
    try {
      if (partage === 'Oui') {
        await insertPix( {
          nom: nom,
          prenom: prenom,
          id: id,
          partage: partage,
          datePartage: datePartage,
          palier: palier,
          competence1: competence1,
          competence2: competence2,
          competence3: competence3,
        });
      }
    } catch (error) {
      logger.info(`KO ${error.message}`);
    }
  }
  logger.info(i);
  logger.info(j);
});
