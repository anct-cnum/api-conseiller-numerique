#!/usr/bin/env node
'use strict';
const path = require('path');
const fs = require('fs');
const { program } = require('commander');
const { execute } = require('../utils');
const {
  loginAPI,
  getTeam,
  getUsersTeams,
} = require('../../utils/mattermost');

require('dotenv').config();


execute(__filename, async ({ logger, exit, app }) => {
  program.option('-t, --team <team>', 'team: id de la Team');
  program.option('-p, --page <page>', 'page: indiqué la page');
  program.helpOption('-e', 'HELP command');
  program.parse(process.argv);

  const idTeam = program.team;
  const numberPage = program.page;
  let promises = [];
  if (!idTeam && !numberPage) {
    exit('Veuillez définir l\'id de la Team Et un numéro de page');
    return;
  }
  const mattermost = app.get('mattermost');
  const token = await loginAPI({ mattermost });
  const resultNomTeam = await getTeam(mattermost, token, idTeam);
  const { data } = await getUsersTeams(mattermost, token, idTeam, numberPage);
  const resultData = `Il y ${data.length} membres dans la Team : ${resultNomTeam.data.name}`;
  if (data.length === 0) {
    exit(resultData);
    return;
  }

  logger.info(resultData);
  const emailTeams = data.map(user => user.email);

  logger.info(`Generating CSV file...`);
  let csvFile = path.join(__dirname, '../../../data/exports', `${resultNomTeam.data.name}-page-${numberPage}.csv`);
  let file = fs.createWriteStream(csvFile, { flags: 'w' });

  file.write(`Email ${resultNomTeam.data.name}\n`);
  emailTeams.forEach(email => {
    promises.push(new Promise(async resolve => {
      file.write(`${email}\n`);
      resolve();
    }));
  });
  await Promise.all(promises);
  file.close();
});
