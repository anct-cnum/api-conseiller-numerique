#!/usr/bin/env node
'use strict';
const path = require('path');
const fs = require('fs');
const { program } = require('commander');
const { execute } = require('../utils');
const {
  loginAPI,
  getUsersTeams,
} = require('../../utils/mattermost');

require('dotenv').config();


execute(__filename, async ({ logger, exit, app }) => {
  program.option('-t, --teams <teams>', 'teams: id de la Teams');
  program.helpOption('-e', 'HELP command');
  program.parse(process.argv);

  const idTeams = program.teams;
  let promises = [];
  if (!idTeams) {
    exit('Veuillez définir l\'id de la Teams');
    return;
  }

  const mattermost = app.get('mattermost');
  const token = await loginAPI({ mattermost });
  const { data } = await getUsersTeams(mattermost, token, idTeams);
  const resultData = `Il y ${data.length} membres dans la Teams : ${idTeams}`;
  if (data.length === 0) {
    exit(resultData);
    return;
  }

  logger.info(resultData);
  const emailTeams = data.map(user => user.email);

  logger.info(`Generating CSV file...`);
  let csvFile = path.join(__dirname, '../../../data/exports', 'user-eco-systeme.csv');
  let file = fs.createWriteStream(csvFile, { flags: 'w' });

  file.write('Email Eco-système\n');
  emailTeams.forEach(email => {
    promises.push(new Promise(async resolve => {
      // eslint-disable-next-line max-len
      file.write(`${email}\n`);
      resolve();
    }));
  });
  await Promise.all(promises);
  file.close();
});
