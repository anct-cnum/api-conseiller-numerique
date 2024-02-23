#!/usr/bin/env node
'use strict';
require('dotenv').config();
const { program } = require('commander');
const dayjs = require('dayjs');

const { execute } = require('../../utils');

program.description('Modification date de démission pour un conseiller')
.option('-c, --conseiller <id>', 'id: id PG du conseiller')
.option('-s, --structure <id>', 'id: id PG de la structure')
.option('-d, --date <date>', 'date : entrer la date de démission du conseiller sous ce format AAAA-MM-DD')
.helpOption('-e', 'HELP command')
.parse(process.argv);

const formatDate = date => {
  return dayjs(date, 'YYYY-MM-DD').toDate();
};

const regexDateRupture = new RegExp(/^((202)[1-9])(-)(((0)[0-9])|((1)[0-2]))(-)([0-2][0-9]|(3)[0-1])$/);

execute(__filename, async ({ db, logger, exit }) => {

  const idConseiller = ~~program.conseiller;
  const idStructure = ~~program.structure;

  if (idConseiller === 0 || idStructure === 0 || !regexDateRupture.test(program.date)) {
    exit(`Paramètres invalides : préciser l'id du conseiller, l'id de la structure et une date de démission valide`);
    return;
  }

  const dateRupture = formatDate(program.date);

  await new Promise(async () => {

    const structure = await db.collection('structures').findOne({ idPG: idStructure });

    const { _id } = await db.collection('conseillers').findOne({
      'idPG': idConseiller,
      'ruptures.structureId': structure?._id
    }) || {};

    if (_id === undefined) {
      exit(`Conseiller id ${idConseiller} en rupture avec la structure id ${idStructure} inconnu dans MongoDB`);
      return;
    }

    //Mise à jour dans l'historisation
    await db.collection('conseillersRuptures').updateOne(
      {
        conseillerId: _id,
        structureId: structure._id
      },
      {
        $set: {
          dateRupture
        }
      });

    //Mise à jour dans le doc Conseiller
    await db.collection('conseillers').updateOne(
      {
        _id,
        'ruptures.structureId': structure._id
      },
      {
        $set: {
          'ruptures.$.dateRupture': dateRupture
        }
      });

    //Mise à jour de la mise en relation avec la structure en rupture
    await db.collection('misesEnRelation').updateOne(
      {
        'conseiller.$id': _id,
        'structure.$id': structure._id,
        'statut': 'finalisee_rupture',
        'conseillerObj.ruptures.structureId': structure._id
      },
      {
        $set: {
          dateRupture,
          'conseillerObj.ruptures.$.dateRupture': dateRupture
        }
      }
    );

    //Mise à jour des autres mises en relation
    await db.collection('misesEnRelation').updateMany(
      {
        'conseiller.$id': _id,
        'structure.$id': { $ne: structure._id },
        'conseillerObj.ruptures.structureId': structure._id
      },
      {
        $set: {
          'conseillerObj.ruptures.$.dateRupture': dateRupture
        }
      }
    );

    logger.info(`Mise à jour de la date de rupture pour le conseiller id ${idConseiller} au ${program.date} avec la structure ${idStructure}`);
    exit();
  });
});
