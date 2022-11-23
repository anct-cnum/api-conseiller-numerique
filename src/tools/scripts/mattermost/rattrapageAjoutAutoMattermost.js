#!/usr/bin/env node
'use strict';

const { program } = require('commander');

require('dotenv').config();

const { execute } = require('../../utils');
const { loginAPI, joinChannel } = require('../../../utils/mattermost');

execute(__filename, async ({ db, logger, exit, app }) => {

  program.option('-d, --destination <destination>', 'destination: id channel');
  program.helpOption('-e', 'HELP command');
  program.parse(process.argv);

  const destination = program.destination;

  const sleep = ms => new Promise(r => setTimeout(r, ms));

  if (!destination) {
    exit('Paramètres invalides : veuillez renseigner channel de destination');
    return;
  }
  const mattermost = app.get('mattermost');
  const token = await loginAPI({ mattermost });
  const idMember = await db.collection('conseillers').distinct('mattermost.id');

  logger.info(`Rattrapage pour ajouter les CnFS vers le channelId ${destination}`);

  if (idMember >= 1) {
    for (const idCN of idMember) {
      await joinChannel(mattermost, token, destination, idCN);
    }
    //To avoid overload Mattermost API
    await sleep(1000);
  }
  exit();
});
