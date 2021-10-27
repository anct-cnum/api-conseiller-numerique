#!/usr/bin/env node
'use strict';

const { execute } = require('../../utils');
const { loginAPI, createChannel, joinTeam } = require('../../../utils/mattermost');
const { findDepartement } = require('../../../utils/geo');

execute(__filename, async ({ app, db, logger, Sentry }) => {
  const mattermost = app.get('mattermost');
  const token = await loginAPI({ mattermost });

  const sleep = ms => new Promise(r => setTimeout(r, ms));
  /*const hubs = require('../../../../data/imports/hubs.json');
  await deleteArchivedChannels(mattermost, token);
  for (const hub of hubs) {
    const result = await createChannel(mattermost, token, hub.name);
    hub.channelId = result.data.id;
    await db.collection('hubs').insertOne(hub);
  }*/

  let count = 0;
  const conseillers = await db.collection('conseillers').find({
    'mattermost': { $ne: null },
    'mattermost.error': { $ne: true },
    'mattermost.hubJoined': { $ne: true }
  }).toArray();

  for (const conseiller of conseillers) {
    const structure = await db.collection('structures').findOne({ _id: conseiller.structureId });

    try {
      const regionName = findDepartement(structure.codeDepartement).region_name;

      let hub = await db.collection('hubs').findOne({ region_names: { $elemMatch: { $eq: regionName } } });

      if (hub === null) {
        hub = await db.collection('hubs').findOne({ departements: { $elemMatch: { $eq: `${structure.codeDepartement}` } } });
      }
    
      if (hub !== null) {
        try {
          await joinTeam(mattermost, token, mattermost.hubTeamId, conseiller.mattermost.id);
          await joinChannel(mattermost, token, hub.channelId, conseiller.mattermost.id);
          db.collection('conseillers').updateOne({ _id: conseiller._id }, {
            $set: { 'mattermost.hubJoined': true }
          });
          count++;
        } catch (e) {
          console.log(conseiller._id, hub);
          Sentry.captureException(e);
          logger.error(e);//.response.data
        }
      }
    } catch (e) {
      Sentry.captureException(e);
      logger.error(e);
    }

    // To avoid overload Mattermost API
    await sleep(500);
  }

  logger.info(`[MATTERMOST] ${count} conseillers ont été ajoutés dans un hub`);
});
