#!/usr/bin/env node
/* eslint-disable guard-for-in */
'use strict';

const ObjectID = require('mongodb').ObjectID;
const { program } = require('commander');

const { v4: uuidv4 } = require('uuid');

require('dotenv').config();

const { execute } = require('../../../utils');

const doCreateUser = async (db, feathers, dbName, _id) => {
  return new Promise(async resolve => {
    const structure = await db.collection('structures').findOne({ _id: _id });
    await feathers.service('users').create({
      name: structure.contactEmail,
      password: uuidv4(), // mandatory param
      roles: Array('structure'),
      entity: {
        '$ref': `structures`,
        '$id': _id,
        '$db': dbName
      },
      token: uuidv4(),
      mailSentDate: null, // on stock la date du dernier envoi de mail de création pour le mécanisme de relance
      passwordCreated: false,
      createdAt: new Date(),
    });
    await feathers.service('structures').patch(_id, {
      userCreated: true
    });
    resolve();
  });
};

execute(async ({ feathers, db, logger, exit }) => {

  program.option('-a, --all', 'all: toutes les structures');
  program.option('-l, --limit <limit>', 'limit: limite le nombre de structures à traiter', parseInt);
  program.option('-i, --id <id>', 'id: une seule structure');
  program.helpOption('-e', 'HELP command');
  program.parse(process.argv);

  const quit = count => {
    logger.info(`${count} utilisateurs créés`);
    exit();
  };

  let { all, limit = 1, id } = program;
  console.log(limit, all);

  let usersCreatedCount = 0;

  const dbName = db.serverConfig.s.options.dbName;

  if (!(!(!all && id) ^ !(all && !id))) {
    exit('Paramètres invalides. Veuillez précisez un id ou le paramètre all');
  }

  if (all && !limit) {
    exit('Paramètres invalides. La limit est obligatoire avec le paramètre all.');
  }

  if (id) {
    const _id = new ObjectID(id);
    const count = await db.collection('structures').countDocuments({ userCreated: true, _id: _id });
    if (count > 0) {
      exit('Un utilisateur existe déjà pour cette structure');
    }
    await doCreateUser(db, feathers, dbName, _id);
    usersCreatedCount++;
  } else {
    const structures = await db.collection('structures').find({ userCreated: false }).toArray();
    for (const idx in structures) {
      const structure = structures[idx];
      const count = await db.collection('misesEnRelation').countDocuments({ 'structure': {
        '$ref': `structures`,
        '$id': structure._id,
        '$db': dbName
      } });
      if (count > 0) {
        await doCreateUser(db, feathers, dbName, structure._id);
        usersCreatedCount++;
        if (usersCreatedCount === limit) {
          quit(usersCreatedCount);
        }
      }
    }
  }

  quit(usersCreatedCount);
});
