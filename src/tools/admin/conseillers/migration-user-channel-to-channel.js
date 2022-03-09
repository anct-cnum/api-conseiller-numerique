#!/usr/bin/env node
'use strict';

const { program } = require('commander');

require('dotenv').config();

const { execute } = require('../../utils');
const {
  loginAPI,
  joinChannel,
  getUsersChannel,
  deleteUsersChannel } = require('../../../utils/mattermost');

execute(__filename, async ({ logger, exit, app }) => {

  program.option('-o, --origine <origine>', 'origine: id channel');
  program.option('-d, --destination <destination>', 'destination: id channel');
  program.option('-s, --suppression', 'suppression: suppression des membres de l\'ancien channel');
  program.helpOption('-e', 'HELP command');
  program.parse(process.argv);

  const origine = program.origine;
  const destination = program.destination;
  const suppression = program.suppression;

  let idChannel;
  if (!origine || !destination) {
    exit('Paramètres invalides');
    return;
  }
  idChannel = origine;
  const mattermost = app.get('mattermost');
  const token = await loginAPI({ mattermost });
  const { data } = await getUsersChannel(mattermost, token, idChannel);

  logger.info(`Migration de ${data.length} membres du channelId ${origine} vers channelId ${destination}`);

  if (data.length >= 1) {
    for (let i of data) {
      const idUser = i.user_id;
      idChannel = destination;
      await joinChannel(mattermost, token, idChannel, idUser);
      if (suppression) {
        idChannel = origine;
        await deleteUsersChannel(mattermost, token, idChannel, idUser);
      }
    }
  }
  exit();
});
