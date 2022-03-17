#!/usr/bin/env node
'use strict';

const { program } = require('commander');

require('dotenv').config();

const { execute } = require('../../utils');
const {
  loginAPI,
  joinChannel,
  getUsersChannel,
  deleteUserChannel } = require('../../../utils/mattermost');

execute(__filename, async ({ logger, exit, app }) => {

  program.option('-o, --origine <origine>', 'origine: id channel');
  program.option('-d, --destination <destination>', 'destination: id channel');
  program.option('-s, --suppression', 'suppression: suppression des membres de l\'ancien channel');
  program.helpOption('-e', 'HELP command');
  program.parse(process.argv);

  const origine = program.origine;
  const destination = program.destination;
  const suppression = program.suppression;

  const sleep = ms => new Promise(r => setTimeout(r, ms));

  if (!origine || !destination) {
    exit('Paramètres invalides : veuillez renseigner le channel source et le channel de destination');
    return;
  }
  const mattermost = app.get('mattermost');
  const token = await loginAPI({ mattermost });
  const { data } = await getUsersChannel(mattermost, token, origine);

  logger.info(`Migration de ${data.length} membres du channelId ${origine} vers channelId ${destination}`);

  if (data.length >= 1) {
    for (const member of data) {
      await joinChannel(mattermost, token, destination, member.user_id);
      if (suppression) {
        await deleteUserChannel(mattermost, token, origine, member.user_id);
      }
    }
    //To avoid overload Mattermost API
    await sleep(1000);
  }
  exit();
});
