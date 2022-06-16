#!/usr/bin/env node
'use strict';

require('dotenv').config();

const { execute } = require('../utils');

execute(__filename, async ({ db, exit }) => {

  // Cas 1 : A créé une permanence mais pas principal
  const promises = [];
  const permanences = await db.collection('permanences').find({
    'lieuPrincipalPour': [],
    'estStructure': false
  }).toArray();

  let conseillersSuspects = [];
  permanences.forEach(permanence => {
    if (!conseillersSuspects.includes(permanence.conseillers[0])) {
      conseillersSuspects.push(permanence.conseillers[0]);
    }
  });

  let conseillersCoupables = [];
  conseillersSuspects.forEach(conseiller => {
    const p = new Promise(async resolve => {
      if (await db.collection('permanences').countDocuments({
        'conseillers': { '$in': [conseiller] }
      }) <= 1) {
        console.log(conseiller);
        conseillersCoupables.push(conseiller);
      }
      resolve();
    });
    promises.push(p);
  });

  await Promise.all(promises);

  //Cas 2 : A créé plusieurs permanences secondaires mais aucune principal
  const promiseCas2 = [];
  const users = await db.collection('users').find({ 'showPermanenceForm': false }).toArray();
  users.forEach(user => {
    const p = new Promise(async resolve => {
      if (await db.collection('permanences').countDocuments({
        'lieuPrincipalPour': { '$in': [user.entity.oid] }
      }) === 0) {
        console.log(user);
      }
      resolve();
    });
    promiseCas2.push(p);
  });

  await Promise.all(promiseCas2);

  exit();
});
