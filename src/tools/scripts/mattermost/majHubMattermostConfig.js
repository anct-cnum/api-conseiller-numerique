#!/usr/bin/env node
'use strict';

const { program } = require('commander');

require('dotenv').config();

const { execute } = require('../../utils');
const {
  loginAPI,
  joinChannel,
  getUsersChannel } = require('../../../utils/mattermost');
const infoFrance = require('../../../../data/imports/departements-region.json');
const infoHub = require('../../../../data/imports/hubs.json');
const codeRegion = require('../../../../data/imports/code_region.json');

execute(__filename, async ({ logger, exit, app, db }) => {

  program.option('-h, --hub <hub>', 'hub: nom du hub');
  program.helpOption('-e', 'HELP command');
  program.parse(process.argv);

  const nameHub = program.hub;
  if (!nameHub) {
    exit('Paramètres invalides, veuillez saisir un nom de HUB'); // Test ok !
    return;
  }
  let localite = infoHub.find(obj => obj.name === nameHub); // ["Occitanie"] //{ name: 'RhinOcc', region_names: [ 'Occitanie' ] }
  console.log('localite:', localite.name);
  if (!localite) {
    exit(`Paramètres invalides, veuillez saisir un nom de HUB valide parmi cette liste [${infoHub.map(h => h.name)}]`); // Test ok
    return;
  }

  let hub = await db.collection('hubs').findOne(localite); // hub.region_names[0] => [ 'Occitanie' ],
  // hub: {
  //   _id: 61728bbef343bb5dc3409a79,
  //   name: 'RhinOcc',
  //   region_names: [ 'Occitanie' ],
  //   channelId: 'z6x5r1o8cfyqtebzm53pd68n7w'
  // }
  const codeRegionAtHub = codeRegion.find(code => code.nom === hub.region_names[0]).code; // { nom: 'Occitanie', code: '76' } => '76'
  const arrayUtilisateur = await db.collection('conseillers').distinct('mattermost.id', {
    'statut': 'RECRUTE',
    'mattermost.hubJoined': true,
    'codeRegionStructure': codeRegionAtHub
  });
  console.log('QUERY', {
    'statut': 'RECRUTE',
    'mattermost.hubJoined': true,
    'codeRegionStructure': codeRegionAtHub
  });
  console.log('data DISTINCT:', arrayUtilisateur.length);
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const mattermost = app.get('mattermost');
  const token = await loginAPI({ mattermost });
  if (arrayUtilisateur.length >= 1) {
    for (const member of arrayUtilisateur) {
      await joinChannel(mattermost, token, hub.channelId, member);
      await sleep(1000); //To avoid overload Mattermost API
    }
  }
  exit();
});

// node src/tools/scripts/mattermost/majHubMattermostConfig.js --hub RhinOcc
// value option origine tableau d'id pour saisir plusieurs cannaux
// value option canaux destinataire
// récuperer tout les utilisateurs (id) des cannaux saisi (meme celui du canaux destinataire) via une api de mattermost
// enlever les doublons id utilisateur
// map des id utilisateur à ajouter (via api mattermost)
// ........
// program.option('-o, --origine <origine>', 'origine: 123,123,455');
// const origine = program.origine.split(','); // 123,456,789 // [ '123', '456', '789' ]
// const { data } = await getUsersChannel(mattermost, token, id); // option à éviter car limitation de page...
