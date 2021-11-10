#!/usr/bin/env node
'use strict';

const { execute } = require('../../utils');

const toTerritoireList = null;
const getTerritoires = async db => await db.collection('stats_Territoires').find().map(toTerritoireList).toArray();

const isConseillerDoublon = null;

const searchCorrectConseillerId = null;

const updateTerritoire = null;

execute(__filename, async ({ db, logger, exit }) => {
  logger.info('Script de correction des Ids conseillers en doublon par territoires');

  const territoires = await getTerritoires(db);

  try {
    territoires.forEach(territoire => {
      if (territoire.conseillerIds.length > 0) {
        let nouvelleListeConseillerIds = [];

        territoire.conseillerIds.forEach(id => {
          if (isConseillerDoublon(db, id)) {

          } else {

          }
        });
        console.log(territoire);
      }
    });
  } catch (error) {

  }

  exit();
});
