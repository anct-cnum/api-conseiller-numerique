#!/usr/bin/env node
'use strict';
require('dotenv').config();
const cli = require('commander');
const { ObjectId } = require('mongodb');
const { execute } = require('../../utils');

cli.description('Suppresion de la clé userCreationError pour un conseiller ou tout les conseillers recrutés')
.option('-c, --conseiller <id>', 'id: id du conseiller')
.helpOption('-e', 'HELP command')
.parse(process.argv);

execute(__filename, async ({ db, logger, exit }) => {

  const idConseiller = cli.conseiller;
  await new Promise(async () => {
    if (idConseiller) {
      const conseiller = await db.collection('conseillers').findOne({ _id: new ObjectId(idConseiller) });
      if (conseiller === null) {
        exit('id conseiller inconnu dans la bdd mongodb');
        return;
      }
      await db.collection('conseillers').updateOne(
        {
          _id: new ObjectId(idConseiller),
        },
        {
          $unset: {
            userCreationError: ''
          }
        });
      logger.info(`Suppresion de la clé userCreationError pour le conseiller id ${idConseiller}`);
      exit();
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
      logger.info(`Suppresion de la clé userCreationError pour tous les conseillers recrutés`);
      exit();
    }
  });
});
