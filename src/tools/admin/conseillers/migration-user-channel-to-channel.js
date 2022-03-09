#!/usr/bin/env node
'use strict';

const { program } = require('commander');

require('dotenv').config();

const { execute } = require('../../utils');
const { loginAPI, joinChannel, getUsersChannel, deleteUsersChannel } = require('../../../utils/mattermost');

execute(__filename, async ({ logger, exit, app, Sentry }) => {

  program.option('-o, --origine <origine>', 'origine: clear text');
  program.option('-d, --destination <destination>', 'destination: create');
  program.helpOption('-e', 'HELP command');
  program.parse(process.argv);

  const origine = program.origine;
  const destination = program.destination;
  let idChannel;
  if (!origine || !destination) {
    exit('Paramètres invalides');
    return;
  }
  idChannel = origine;

  const mattermost = app.get('mattermost');
  const token = await loginAPI({ mattermost });
  const { data } = await getUsersChannel(mattermost, token, idChannel);

  if (data.length >= 1) {
    for (let i of data) {
      const idUser = i.user_id;
      idChannel = destination;
      await joinChannel(mattermost, token, idChannel, idUser);
      idChannel = origine;
      await deleteUsersChannel(mattermost, token, idChannel, idUser);
      logger.info(`mattermost.id : `);
    }
  }
});
