#!/usr/bin/env node
'use strict';
const path = require('path');
const fs = require('fs');
const axios = require('axios');
const dayjs = require('dayjs');
const { program } = require('commander');

const { execute } = require('../../utils');

// node src/tools/scripts/crisp/export-stat-crisp.js -p 50 --type notResolved
// node src/tools/scripts/crisp/export-stat-crisp.js -p 60 --type mensuelle -m 03 -a 2024

execute(__filename, async ({ logger, app, exit }) => {
  program.option('-p, --page <page>', 'page: numero de page max');
  program.option('-t, --type <type>', 'type: mensuelle ou notResolved');
  program.option('-m, --mois <mois>', 'mois: numero de mois');
  program.option('-a, --annee <annee>', 'annee: annee');
  program.helpOption('-e', 'HELP command');
  program.parse(process.argv);
  const { annee, mois, type, page } = program.opts();
  const crisp = app.get('crisp');
  let promises = [];
  let datas = [];
  if (!['mensuelle', 'notResolved'].includes(type)) {
    exit('le type est invalide');
    return;
  }
  if (!mois && type === 'mensuelle') {
    exit('Préciser le numéro de mois souhaité');
    return;
  }
  if (~~page === 0) {
    exit('Il faut préciser le nombre de page à parcourir');
    return;
  }
  if (!annee && type === 'mensuelle') {
    exit(`L'année est invalide`);
    return;
  }
  const arrayDate = [
    { mois: '01', fin: '31', name: 'janvier' },
    { mois: '02', fin: '29', name: 'fevrier' },
    { mois: '03', fin: '31', name: 'mars' },
    { mois: '04', fin: '30', name: 'avril' },
    { mois: '05', fin: '31', name: 'mai' },
    { mois: '06', fin: '30', name: 'juin' },
    { mois: '07', fin: '31', name: 'juillet' },
    { mois: '08', fin: '31', name: 'aout' },
    { mois: '09', fin: '30', name: 'septembre' },
    { mois: '10', fin: '31', name: 'octobre' },
    { mois: '11', fin: '30', name: 'novembre' },
    { mois: '12', fin: '31', name: 'decembre' },
  ];
  const filterMois = arrayDate.find(e => e.mois === mois);
  if (!filterMois && type === 'mensuelle') {
    exit(`Le numéro de mois "${mois}" est invalide`);
    return;
  }

  for (let i = 1; i <= ~~page; i++) {
    const stat = type === 'mensuelle' ? `?filter_date_start=${annee}-${filterMois.mois}-01T00:00:00.000Z&filter_date_end=${annee}-${filterMois.mois}-${filterMois.fin}T23:59:59.059Z` : `?filter_not_resolved=1`;
    const config = {
      method: 'get',
      url: `https://app.crisp.chat/api/v1/website/${crisp.idSite}/conversations/${i}${stat}`,
      headers: {
        'X-Crisp-Tier': 'plugin',
        'Authorization': `Basic ${crisp.token}`
      }
    };
    const result = await axios(config);
    datas = datas.concat(result.data.data);
  }
  const formatDate = date => dayjs(date).format('DD/MM/YYYY');
  logger.info(`Au total ${datas.length} conversations fait le ${new Date()} (${type} : ${type}-${(mois ? filterMois?.name : formatDate(new Date()))?.replaceAll('/', '-')})`);

  let count = 0;
  logger.info(`Generating CSV file...`);
  let csvFile = path.join(__dirname, '../../../../data/exports', `${type}-${(mois ? filterMois?.name : formatDate(new Date()))?.replaceAll('/', '-')}.csv`);

  let file = fs.createWriteStream(csvFile, {
    flags: 'w'
  });
  const lien = `https://app.crisp.chat/website/${crisp.idSite}/inbox/`;
  let statusConservations = [
    { value: 0, label: 'Non traité', statut: 'pending', count: 0 },
    { value: 1, label: 'En cours', statut: 'unresolved', count: 0 },
    { value: 2, label: 'Fermé', statut: 'resolved', count: 0 },
  ];
  let userIdAssigned = [
    { id: '-', user: 'Non assignée', count: 0 },
    // mettre la liste des users...
  ];
  const thematiqueCrisp = [
    'Communication',
    'Convention',
    'Disposiitf',
    'Espace candidat',
    'Espace coop',
    'Esapce structure',
    'Fomation',
    'Kit d\'animation',
    'RH',
    'Subvention',
    'Espace DS',
    'Questionnaire',
    'Demande de rdv telephonique',
    'Relance CRA',
    'Rupture',
  ];
  const demandeurCrisp = [
    'Structure',
    'Conseiller numérique',
    'Prefecture',
    'Coordo',
    'cnfs',
  ];
  const orignineCrisp = [
    'email',
    'chat'
  ];
  file.write('Instructeurs;Demandeur;Source;Thématique;Problématique;Détail CRA;Traitement de la demande;Détail problématique;Date de dépôt;Date de traitement;Date de résolution;Etat;ID CNFS;Nom;Prénom;Mail cnfs;Structure d\'accueil;Mail contact;ID-SIRET-DS;Infos supp;Lien CRISP/ Mail;Infos supp 2\n');
  datas.forEach(c => {
    promises.push(new Promise(async resolve => {
      const regexEmailCNFS = new RegExp('(?<name>@conseiller-numerique.fr)');
      if (!c?.assigned?.user_id) {
        userIdAssigned[0].count++;
      }
      const intitule = {
        Instructeurs: !c?.assigned?.user_id ? '-' : userIdAssigned.find((i, index) => {
          if (i.id === c?.assigned?.user_id) {
            userIdAssigned[index].count++;
          }
          return i.id === c?.assigned?.user_id;
        })?.user,
        Demandeur: c?.meta?.segments?.filter(i => demandeurCrisp.map(e => e.toLocaleUpperCase()).includes(i.toUpperCase()))?.toString()?.replaceAll(',', '>')?.replaceAll('cnfs', 'Conseiller numérique'),
        Source: ['crisp', ...c?.meta?.segments?.filter(i => orignineCrisp.map(e => e.toLocaleUpperCase()).includes(i.toUpperCase()))]?.toString()?.replaceAll(',', '>'),
        Thematique: c?.meta?.segments?.filter(i => thematiqueCrisp.map(e => e.toLocaleUpperCase()).includes(String(i.toUpperCase())))?.toString()?.replaceAll(',', '>'),
        Problématique: '',
        DetailCRA: '',
        TraitementDeLaDemande: '',
        DetailProblematique: '',
        DateDeDepot: formatDate(c.created_at),
        DateDeTraitement: formatDate(c.updated_at),
        DateDeResolution: formatDate(c.updated_at),
        Etat: statusConservations.find((i, index) => {
          if (i.value === c.status && c.statut === i.state) {
            statusConservations[index].count++;
          }
          return i.value === c.status && c.statut === i.state;
        })?.label ?? '-',
        IDCNFS: '',
        Nom: '',
        Prenom: '',
        MailCnfs: regexEmailCNFS.test(c.meta.email) ? c.meta.email : '',
        StructureAaccueil: '',
        MailContact: c.meta.email,
        IDSIRETDS: '',
        InfosSupp: '',
        LienCrisp: lien + c.session_id,
        InfosSupp2: '',
      };
      file.write(`${String(Object.getOwnPropertyNames(intitule).map(i => intitule[i]))?.replaceAll(',', ';')?.replaceAll('>', '/ ')}\n`);
      count++;
      resolve();
    }));
  });
  await Promise.all(promises);
  logger.info(`${count} dans le fichier...`);
  logger.info(`STATUT :`);
  await statusConservations.map(i => console.log(`- ${i.label}: ${i.count}`));
  logger.info(`PERSO :`);
  await userIdAssigned.map(i => console.log(`- ${i.user}: ${i.count}`));
  file.close();
});
