#!/usr/bin/env node
'use strict';

const { execute } = require('../../utils');
const { loginAPI, createChannel, joinChannel, deleteArchivedChannels } = require('../../../utils/mattermost');
const { findDepartement } = require('../../../utils/geo');

execute(__filename, async ({ app, db, logger }) => {
  const mattermost = app.get('mattermost');
  const token = await loginAPI({ mattermost });

  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const hubs = require('../../../../data/imports/hubs.json');
  await deleteArchivedChannels(mattermost, token);
  for (const hub of hubs) {
    const result = await createChannel(mattermost, token, hub.name);
    hub.channelId = result.data.id;
    await db.collection('hubs').insertOne(hub);
  }

  let count = 0;
  const conseillers = await db.collection('conseillers').find({ mattermost: { $ne: null } }).toArray();
  for (const conseiller of conseillers) {
    const structure = await db.collection('structures').findOne({ _id: conseiller.structureId });
    const regionName = findDepartement(structure.codeDepartement).region_name;

    let hub = await db.collection('hubs').findOne({ region_names: { $elemMatch: { $eq: regionName } } });
    if (hub === null) {
      hub = await db.collection('hubs').findOne({ departements: { $elemMatch: { $eq: `${structure.codeDepartement}` } } });
    }
    if (hub !== null) {
      count++;
      joinChannel(mattermost, token, hub.channelId, conseiller.mattermost.id);
    }

    // To avoid overload Mattermost API
    await sleep(500);
  }

  logger.info(`[MATTERMOST] ${count} conseillers ont été ajoutés dans un hub`);
});
