#!/usr/bin/env node
'use strict';

const { ObjectID } = require('mongodb');
const { execute } = require('../utils');
const { program } = require('commander');

execute(__filename, async ({ db, logger, exit }) => {
  program.option('-i, --id <id>', 'id PG de la structure');
  program.helpOption('-e', 'HELP command');
  program.parse(process.argv);

  if (!program.id) {
    exit('id PG obligatoire');
    return;
  }

  const deleteMisesEnRelation = async s => {
    const filter = {
      'structure.$id': new ObjectID(s._id)
    };

    const result = await db.collection('misesEnRelation').deleteMany(filter);

    logger.info(
      `misesEnRelation,deleted,${s._id},${s.idPG},${result.deletedCount}`
    );
  };

  const structure = await db.collection('structures').findOne({ idPG: ~~program.id });

  if (structure) {
    await deleteMisesEnRelation(structure);
  } else {
    logger.info(`Structure introuvable pour l'idPG ${program.id}`);
  }
  exit();
});
