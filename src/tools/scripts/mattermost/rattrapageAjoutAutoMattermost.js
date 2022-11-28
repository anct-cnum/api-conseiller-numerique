#!/usr/bin/env node
'use strict';

const { program } = require('commander');

require('dotenv').config();

const { execute } = require('../../utils');
const { loginAPI, joinChannel } = require('../../../utils/mattermost');

execute(__filename, async ({ db, logger, exit, app }) => {

  program.option('-l, --limit <limit>', 'limit: nb de conseillers');
  program.option('-r, --reset', 'reset: reset du flag majMattermost');
  program.helpOption('-e', 'HELP command');
  program.parse(process.argv);

  const limit = ~~program.limit === 0 ? 1 : ~~program.limit;
  const reset = program.reset;
  const mattermost = app.get('mattermost');
  const token = await loginAPI({ mattermost });
  const canaux = [mattermost.acceuilActuChannelId, mattermost.aideEspaceCoopChannelId,
    mattermost.aideMetierChannelId, mattermost.ressourcerieChannelId, mattermost.revuePresseChannelId];

  const conseillerIds = await db.collection('conseillers').find({
    'statut': 'RECRUTE',
    'mattermost.id': { $exists: true },
    'mattermost.majMattermost': { $exists: false }
  })
  .limit(limit)
  .project({
    mattermost: 1
  })
  .toArray();
  logger.info(`Rattrapage pour ajouter ${limit} CnFS vers les 6 canaux`);
  const sleep = ms => new Promise(r => setTimeout(r, ms));

  if (conseillerIds.length >= 1) {
    try {
      for (const cn of conseillerIds) {
        for (const canalId of canaux) {
          await sleep(500);
          await joinChannel(mattermost, token, canalId, cn.mattermost.id);
        }
        await db.collection('conseillers').updateOne(
          { _id: cn._id },
          { $set: { 'mattermost.majMattermost': true }
          });
      }
      logger.info(`Fin du lot ! (${conseillerIds.length} conseillers rattrapé)`);
    } catch (e) {
      logger.error(e);
    }
  }
  if (reset) {
    await db.collection('conseillers').updateMany(
      { 'mattermost.majMattermost': true },
      { $unset: {
        'mattermost.majMattermost': ''
      } }
    );
  }
  exit();
});
