#!/usr/bin/env node
'use strict';
require('dotenv').config();
const { program } = require('commander');
const { execute } = require('../../utils');

program.description('Suppression de la clé userCreationError pour un conseiller ou tous les conseillers recrutés')
.option('-c, --conseiller <id>', 'id: id du conseiller')
.helpOption('-e', 'HELP command')
.parse(process.argv);

execute(__filename, async ({ db, logger, exit }) => {

  const idConseiller = program.conseiller;
  await new Promise(async () => {
    if (idConseiller) {
      const conseiller = await db.collection('conseillers').findOne({
        idPG: idConseiller,
        statut: 'RECRUTE',
        userCreationError: true
      });
      if (conseiller === null) {
        exit('id conseiller avec statut \'RECRUTE\' et avec la clé userCreationError inconnu dans la bdd mongodb');
        return;
      }
      await db.collection('conseillers').updateOne(
        {
          idPG: idConseiller,
        },
        {
          $unset: {
            userCreationError: ''
          }
        });
      logger.info(`Suppression de la clé userCreationError pour le conseiller id ${idConseiller}`);
    } else {
      await db.collection('conseillers').updateMany(
        {
          statut: 'RECRUTE',
          userCreationError: true
        },
        {
          $unset: {
            userCreationError: ''
          }
        }
      );
      logger.info(`Suppression de la clé userCreationError pour tous les conseillers recrutés`);
    }
    exit();
  });
});
