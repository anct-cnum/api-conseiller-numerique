#!/usr/bin/env node
'use strict';

const CSVToJSON = require('csvtojson');
const { execute } = require('../../utils');
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
  .replace(/[\s]+/g, ''); // supprime les espaces
  //console.log(reg);
  return reg;
}

function diacriticSensitiveRegex(string = '') {
  const reg = string.replace(/(.)/g, '$1[-]*\\s*') // tirets et espaces
  .replace(/a/g, '[a,á,à,ä,â,A,Á,À,Ä,Â]')
  .replace(/e/g, '[e,é,è,ê,ë,E,É,È,Ê,Ë]')
  .replace(/i/g, '[i,í,ï,I,Í,Ï]')
  .replace(/y/g, '[y,ÿ,Y,Ÿ]')
  .replace(/o/g, '[o,ó,ö,ò,ô,O,Ó,Ö,Ò,Ô]')
  .replace(/u/g, '[u,ü,ú,ù,U,Ü,Ú,Ù]')
  .replace(/c/g, '[c,C,ç,Ç]');
  //console.log(reg);
  return reg;
}

execute(__filename, async ({ db, logger }) => {
  let k = 0;
  let l = 0;
  const insertPix = async pix => {
    try {
      // 1- Chercher avec nom et prénom (ignorer casse et accents)
      // Si ça match, on stocke
      // On cherche aussi en inversant le nom et le prénom
      let query = {
        '$or': [{
          nom: { $regex: diacriticSensitiveRegex(`^${removeAccentsRegex(pix.nom)}`), $options: 'i' },
          prenom: { $regex: diacriticSensitiveRegex(`^${removeAccentsRegex(pix.prenom)}`), $options: 'i' },
        }, {
          nom: { $regex: diacriticSensitiveRegex(`^${removeAccentsRegex(pix.prenom)}`), $options: 'i' },
          prenom: { $regex: diacriticSensitiveRegex(`^${removeAccentsRegex(pix.nom)}`), $options: 'i' },
        }]
      };

      const conseillers = await db.collection('conseillers').find(query).toArray();

      let promises = [];

      if (conseillers.length > 0) {
        conseillers.forEach(c => {
          l++;
          const p = new Promise(async resolve => {
            logger.info(`OK;${c.nom};${c.prenom};${pix.nom};${pix.prenom};${pix.id};${c.idPG};${c._id}`);

            const filter = {
              '_id': c._id,
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
            resolve();
          });
          promises.push(p);
        });
        await Promise.all(promises);

      } else {
        // 2- Chercher avec l'id, et on logue
        const c = await db.collection('conseillers').findOne({ idPG: pix.id });
        if (c) {
          logger.info(`KO1;${c.nom};${c.prenom};${pix.nom};${pix.prenom};${pix.id}`);
        } else {
          logger.info(`KO2;${pix.nom};${pix.prenom};${pix.id}`);
        }
        k++;
      }
    } catch (error) {
      logger.info(`Erreur DB : ${error.message}`);
    }
  };

  const replies = await readCSV(program.csv);

  let i = 0;
  let j = 0;
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
      if (nom !== '' && prenom !== '' && partage === 'Oui') {
        j++;
        await insertPix({
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
  logger.info(`${i} lignes au total`);
  logger.info(`${j} partages`);
  logger.info(`${l} conseillers mis à jour dont les doublons`);
  logger.info(`${k} échecs`);
});
