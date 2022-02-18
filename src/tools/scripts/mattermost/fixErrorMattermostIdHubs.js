#!/usr/bin/env node
'use strict';

const departements = require('./../../../../data/imports/departements-region.json');
const { execute } = require('../../utils');
const { loginAPI, joinTeam, joinChannel, getChannel } = require('../../../utils/mattermost');
const slugify = require('slugify');
const { findDepartement } = require('../../../utils/geo');

execute(__filename, async ({ app, db, logger, Sentry }) => {
  const mattermost = app.get('mattermost');
  const token = await loginAPI({ mattermost });

  const sleep = ms => new Promise(r => setTimeout(r, ms));
  let count = 0;
  let countError = 0;
  const conseillers = await db.collection('conseillers').find({
    'mattermost.error': true,
    'mattermost.errorMessage': { $exists: true }
  }).toArray();

  for (const conseiller of conseillers) {
    try {
      slugify.extend({ '-': ' ' });
      slugify.extend({ '\'': ' ' });
      const departement = departements.find(d => `${d.num_dep}` === conseiller.codeDepartement);
      const channelName = slugify(departement.dep_name, { replacement: '', lower: true });

      const resultChannel = await getChannel(mattermost, token, channelName);
      logger.info(resultChannel);
      const idTeam = mattermost.teamId;
      const idUser = conseiller.mattermost.id;

      const resultJoinTeam = await joinTeam(mattermost, token, idTeam, idUser);
      logger.info(resultJoinTeam);

      [resultChannel.data.id, mattermost.themeChannelId, mattermost.resourcesChannelId].forEach(async canalId => {
        const resultJoinChannel = await joinChannel(mattermost, token, canalId, idUser);
        logger.info(resultJoinChannel);
      });

      const structure = await db.collection('structures').findOne({ _id: conseiller.structureId });
      const regionName = findDepartement(structure.codeDepartement).region_name;

      let hub = await db.collection('hubs').findOne({ region_names: { $elemMatch: { $eq: regionName } } });
      if (hub === null) {
        hub = await db.collection('hubs').findOne({ departements: { $elemMatch: { $eq: `${structure.codeDepartement}` } } });
      }
      if (hub !== null) {
        await joinTeam(mattermost, token, mattermost.hubTeamId, conseiller.mattermost.id);
        joinChannel(mattermost, token, hub.channelId, idUser);
        await db.collection('conseillers').updateOne({ _id: conseiller._id }, {
          $set: { 'mattermost.hubJoined': true }
        });
      }
      await db.collection('conseillers').updateOne({ _id: conseiller._id }, {
        $set: {
          'mattermost.error': false,
        },
        $unset: {
          'mattermost.errorMessage': '',
        }
      });
      count++;
      logger.info(`Conseiller id=${conseiller._id} avec un id mattermost: ${idUser} est corrigé par le script fixErrorMattermostIdHubs.js`);
    } catch (e) {
      Sentry.captureException(e);
      logger.error(e);
      await db.collection('conseillers').updateOne({ _id: conseiller._id },
        { $set:
          { 'mattermost.error': true, 'mattermost.errorMessage': e.message }
        });
      countError++;
    }
    // To avoid overload Mattermost API
    await sleep(500);
  }
  logger.info('Suppression des mattermost.errorMessage pour les mattermost.error qui sont à false');
  // eslint-disable-next-line max-len
  await db.collection('conseillers').updateMany({ 'mattermost.error': false, 'mattermost.errorMessage': '' }, { $unset: { 'mattermost.errorMessage': '' } });

  logger.info(`[MATTERMOST] ${count} conseillers corrigés et ${countError} en erreur(s)`);
});
