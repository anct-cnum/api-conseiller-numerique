#!/usr/bin/env node
'use strict';

require('dotenv').config();

const { execute } = require('../utils');
const { program } = require('commander');

program.option('-limit, --limit <limit>', 'Nombre de users pour les lots 1 2 et 3', parseInt)
.option('-lot, --lot <lot>', 'Numéro de lot 1 à 5', parseInt)
.parse(process.argv);

const groupUsersConseillerByStructure = async db => {
  return await db.collection('users').aggregate([
    {
      $match: {
        roles: { $in: ['conseiller'] },
        passwordCreated: true,
      }
    },
    {
      $addFields: {
        'entity': {
          $arrayElemAt: [{ $objectToArray: '$entity' }, 1]
        }
      }
    },
    {
      $addFields: {
        'entity': '$entity.v'
      }
    },
    {
      $lookup: {
        localField: 'entity', //DBREF non supporté ici donc passage en objectToArray
        from: 'conseillers',
        foreignField: '_id',
        as: 'conseiller'
      }
    },
    { $unwind: '$conseiller' },
    {
      $project: {
        '_id': 1,
        'name': 1,
        'showPermanenceForm': 1, //pour savoir si déjà flaggué ou pas
        'conseiller.structureId': 1
      }
    },
    {
      $group: {
        _id: '$conseiller.structureId',
        count: { $sum: 1 },
        list: { $push: { idUser: '$_id', flag: '$showPermanenceForm' } }
      }
    }
  ]).toArray();
};

execute(__filename, async ({ logger, db, exit }) => {

  const { limit = 50, lot } = program;

  if (!lot || lot < 1 && lot > 5) {
    exit('Lot de déploiement entre 1 et 5');
    return;
  }

  let usersUpdated = 0;
  let usersByStructure = await groupUsersConseillerByStructure(db);

  switch (lot) {
    case 1:
      //Ajout du flag pour X premiers conseillers d'une structure différente
      usersByStructure = usersByStructure.slice(0, limit);
      for (const structure of usersByStructure) {
        //Flag uniquement le premier user
        await db.collection('users').updateOne(
          {
            _id: structure.list[0].idUser
          },
          {
            $set: { showPermanenceForm: true }
          }
        );
        usersUpdated++;
      }
      logger.info(`${usersUpdated} comptes conseillers mis à jour AVEC le flag d'affichage des permanences`);
      break;
    case 2:
      //Comme le lot 1 sauf qu'on exclut les structures ayant déjà un conseiller flaggué
      usersByStructure = usersByStructure.filter(structure => structure.list.some(user => user.flag === true) === false);
      usersByStructure = usersByStructure.slice(0, limit);
      for (const structure of usersByStructure) {
        //Flag uniquement le premier user
        await db.collection('users').updateOne(
          {
            _id: structure.list[0].idUser
          },
          {
            $set: { showPermanenceForm: true }
          }
        );
        usersUpdated++;
      }
      logger.info(`${usersUpdated} comptes conseillers mis à jour AVEC le flag d'affichage des permanences`);
      break;
    case 3:
      //Comme le lot 2 sauf qu'on conserve les structures ayant déjà un conseiller flaggué avec un nombre de users > 1
      usersByStructure = usersByStructure.filter(structure => structure.list.some(user => user.flag === true) === true && structure.count > 1);
      usersByStructure = usersByStructure.slice(0, limit);
      for (const structure of usersByStructure) {
        const listWithoutFlag = structure.list.filter(user => user?.flag !== true);
        //Flag le second user
        await db.collection('users').updateOne(
          {
            _id: listWithoutFlag[0].idUser
          },
          {
            $set: { showPermanenceForm: true }
          }
        );
        usersUpdated++;
      }
      logger.info(`${usersUpdated} comptes conseillers mis à jour AVEC le flag d'affichage des permanences`);
      break;
    case 4:
      //Ajout du flag pour tous les manquants
      const resultLot4 = await db.collection('users').updateMany(
        {
          roles: { $in: ['conseiller'] },
          showPermanenceForm: { $exists: false }
        },
        {
          $set: { showPermanenceForm: true }
        }
      );
      logger.info(`${resultLot4.modifiedCount} comptes conseillers mis à jour AVEC le flag d'affichage des permanences`);
      break;
    case 5:
      //Purge des flags
      const resultLot5 = await db.collection('users').updateMany(
        {
          roles: { $in: ['conseiller'] },
          showPermanenceForm: true
        },
        {
          $unset: { showPermanenceForm: '' }
        }
      );
      logger.info(`${resultLot5.modifiedCount} comptes conseillers mis à jour SANS le flag d'affichage des permanences`);
      break;
    default:
      break;
  }

});

