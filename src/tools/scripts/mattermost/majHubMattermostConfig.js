#!/usr/bin/env node
'use strict';

const { program } = require('commander');

require('dotenv').config();

const { execute } = require('../../utils');
const {
  loginAPI,
  joinChannel,
  joinTeam } = require('../../../utils/mattermost');
const infoHub = require('../../../../data/imports/hubs.json');
const codeRegion = require('../../../../data/imports/code_region.json');

execute(__filename, async ({ logger, exit, app, db }) => {

  program.option('-h, --hub <hub>', 'hub: nom du hub');
  program.helpOption('-e', 'HELP command');
  program.parse(process.argv);

  let query = {};
  const nameHub = program.opts().hub;
  if (!nameHub) {
    exit('Paramètres invalides, veuillez saisir un nom de HUB');
    return;
  }
  const localite = infoHub.find(obj => obj.name === nameHub);
  if (!localite) {
    exit(`Paramètres invalides, veuillez saisir un nom de HUB valide parmi cette liste [${infoHub.map(h => h.name)}]`);
    return;
  }
  const hub = await db.collection('hubs').findOne(localite);
  if (hub?.region_names) {
    const codeRegionAtHub = codeRegion.find(code => code.nom === hub.region_names[0]).code;
    query = { 'codeRegionStructure': codeRegionAtHub };
  } else {
    query = { 'codeDepartementStructure': { '$in': hub?.departements } };
  }

  const arrayUtilisateur = await db.collection('conseillers').distinct('mattermost.id', {
    'statut': 'RECRUTE',
    ...query
  });

  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const mattermost = app.get('mattermost');
  const token = await loginAPI({ mattermost });

  if (arrayUtilisateur.length >= 1) {
    for (const member of arrayUtilisateur) {
      await joinTeam(mattermost, token, mattermost.hubTeamId, member);
      await joinChannel(mattermost, token, hub.channelId, member);
      await db.collection('conseillers').updateOne({ 'mattermost.id': member }, {
        $set: { 'mattermost.hubJoined': true }
      });
      await sleep(1000);
    }
    logger.info(`Ajout de ${arrayUtilisateur.length} CnFS pour le HUB ${nameHub} .`);
  }
  exit();
});
