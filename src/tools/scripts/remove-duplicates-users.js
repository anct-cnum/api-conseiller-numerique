#!/usr/bin/env node
'use strict';

require('dotenv').config();

const { execute } = require('../utils');

execute(async ({ db, logger }) => {

  let count = 0;

  const duplicates = await db.collection('users').aggregate([{
    $group: {
      _id: '$name',
      count: { $sum: 1 }
    }
  }, {
    $match: {
      count: { $gt: 1 }
    }
  }]).toArray();

  for (let idx = 0; idx < duplicates.length; idx++) {
    let duplicate = duplicates[idx];
    await db.collection('users').deleteMany({ name: duplicate._id, passwordCreated: false });
    count++;
  }

  logger.info(`${count} doublons supprimés`);
});
