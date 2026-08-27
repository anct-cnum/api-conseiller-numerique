#!/usr/bin/env node
'use strict';
const path = require('path');
const fs = require('fs');
const axios = require('axios');
const dayjs = require('dayjs');
const { program } = require('commander');

const { execute } = require('../../utils');

const toMarkdownTable = (headers, rows) => {
  const line = cells => `| ${cells.join(' | ')} |`;
  return [line(headers), line(headers.map(() => '---')), ...rows.map(line)].join('\n');
};

// node src/tools/scripts/crisp/export-stat-crisp.js -p 50 --type notResolved
// node src/tools/scripts/crisp/export-stat-crisp.js -p 350 --type mensuelle -m 08 -a 2026

execute(__filename, async ({ logger, app, exit }) => {
  program.option('-p, --page <page>', 'page: numero de page max');
  program.option('-t, --type <type>', 'type: mensuelle ou notResolved');
  program.option('-m, --mois <mois>', 'mois: numero de mois');
  program.option('-a, --annee <annee>', 'annee: annee');
  program.option('-i, --inbox <inbox>', 'inbox: id de l\'inbox Crisp ou "all" pour toutes', 'all');
  program.helpOption('-e', 'HELP command');
  program.parse(process.argv);
  const { annee, mois, type, page, inbox } = program.opts();
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
    try {
      const stat = type === 'mensuelle' ? `?filter_date_start=${annee}-${filterMois.mois}-01T00:00:00.000Z&filter_date_end=${annee}-${filterMois.mois}-${filterMois.fin}T23:59:59.059Z` : `?filter_not_resolved=1`;

      const config = {
        method: 'get',
        url: `https://app.crisp.chat/api/v1/website/${crisp.idSite}/conversations/${i}${stat}&filter_inbox_id=${inbox}`,
        headers: {
          'X-Crisp-Tier': 'plugin',
          'Authorization': `Basic ${crisp.token}`
        }
      };
      const result = await axios(config);
      if (result.data.data.length === 0) {
        console.log(`No data returned, stopping pagination.: ${i}`);
        break;
      }
      datas = datas.concat(result.data.data);
    } catch (error) {
      logger.error(error);
    }
  }
  const formatDate = date => dayjs(date).format('DD/MM/YYYY');
  const periodeLabel = type === 'mensuelle' ? `${filterMois.name}-${annee}` : formatDate(new Date()).replaceAll('/', '-');
  const constatLe = dayjs().format('DD-MM-YYYY_HH[h]_mm');
  logger.info(`Au total ${datas.length} conversations fait le ${new Date()} (${type} : ${periodeLabel})`);

  let count = 0;
  logger.info(`Generating CSV file...`);
  let csvFile = path.join(__dirname, '../../../../data/exports', `${type}-${periodeLabel}-constat-${constatLe}.csv`);

  let file = fs.createWriteStream(csvFile, {
    flags: 'w'
  });
  const lien = `https://app.crisp.chat/website/${crisp.idSite}/inbox/`;
  const categoriesConfig = [
    { tag: 'coop-numerique', label: 'Coop de la médiation' },
    { tag: 'les-bases', label: 'Les bases' },
    { tag: 'min', label: 'MIN' },
    { tag: 'carto', label: 'Cartographie' },
  ];
  const defaultCategorie = 'Conseiller numérique';
  const statutsLabels = [
    { value: 0, label: 'Non traité' },
    { value: 1, label: 'En cours' },
    { value: 2, label: 'Fermé' },
  ];
  const categorieLabels = [defaultCategorie, ...categoriesConfig.map(c => c.label)];
  const categories = new Map(categorieLabels.map(label => [label, statutsLabels.map(s => ({ ...s, count: 0 }))]));

  const resolveCategorie = segments => categoriesConfig.find(c => segments?.includes(c.tag))?.label ?? defaultCategorie;
  const resolveEtat = c => {
    const statut = categories.get(resolveCategorie(c.meta.segments)).find(s => s.value === c.status);
    if (statut) {
      statut.count++;
    }
    return statut?.label ?? '-';
  };

  let userIdAssigned = [
    { id: '-', user: 'Non assignée', count: 0, statut: 'actif' },

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
  const demandeurUpper = new Set(demandeurCrisp.map(e => e.toUpperCase()));
  const orignineUpper = new Set(orignineCrisp.map(e => e.toUpperCase()));
  file.write('Opérateurs;Demandeur;Source;Thématique;Date de dépôt;Date de traitement;Date de résolution;Etat;Mail contact;Lien CRISP/ Mail\n');
  const unknownAssigned = new Map();
  const resolveInstructeur = userId => {
    if (!userId) {
      userIdAssigned[0].count++;
      return userIdAssigned[0].user;
    }
    const known = userIdAssigned.find(i => i.id === userId);
    if (known) {
      known.count++;
      return known.user;
    }
    if (!unknownAssigned.has(userId)) {
      unknownAssigned.set(userId, { label: `Inconnu ${unknownAssigned.size + 1}`, id: userId, count: 0 });
    }
    const unknown = unknownAssigned.get(userId);
    unknown.count++;
    return `${unknown.label} (id : ${unknown.id})`;
  };
  const allSegments = new Map();
  datas.forEach(c => {
    promises.push(new Promise(async resolve => {
      c?.meta?.segments?.forEach(s => allSegments.set(s, (allSegments.get(s) || 0) + 1));
      const intitule = {
        Operateurs: resolveInstructeur(c?.assigned?.user_id),
        Demandeur: c?.meta?.segments?.filter(i => demandeurCrisp.map(e => e.toLocaleUpperCase()).includes(i.toUpperCase()))?.toString()?.replaceAll(',', '>')?.replaceAll('cnfs', 'Conseiller numérique'),
        Source: ['crisp', ...c?.meta?.segments?.filter(i => orignineCrisp.map(e => e.toLocaleUpperCase()).includes(i.toUpperCase()))]?.toString()?.replaceAll(',', '>'),
        Thematique: c?.meta?.segments?.filter(i => !demandeurUpper.has(i.toUpperCase()) && !orignineUpper.has(i.toUpperCase()))?.toString()?.replaceAll(',', '>'),
        DateDeDepot: formatDate(c.created_at),
        DateDeTraitement: formatDate(c.updated_at),
        DateDeResolution: formatDate(c.updated_at),
        Etat: resolveEtat(c),
        MailContact: c.meta.email,
        LienCrisp: lien + c.session_id,
      };
      file.write(`${String(Object.getOwnPropertyNames(intitule).map(i => intitule[i]))?.replaceAll(',', ';')?.replaceAll('>', ', ')}\n`);
      count++;
      resolve();
    }));
  });
  await Promise.all(promises);
  const totals = new Map(categorieLabels.map(label => [label, categories.get(label).reduce((x, s) => x + s.count, 0)]));
  const totalCategorise = [...totals.values()].reduce((x, y) => x + y, 0);

  const nonComptabilisees = count - totalCategorise;
  const contexte = type === 'mensuelle' ? `${periodeLabel} - ${count} conversations` : `${count} non résolues`;
  console.log(`\n### Résumé (${contexte})\n`);
  console.log(toMarkdownTable(
    ['Indicateur', 'Valeur', 'Pourcentage'],
    [
      ['Total conversations', `${count}`, ''],
      ...(nonComptabilisees > 0 ? [['Non comptabilisées', `${nonComptabilisees}`, `${(nonComptabilisees / count * 100).toFixed(0)} %`]] : []),
      ['Conseiller numérique', `${totals.get(defaultCategorie)}`, `${(totals.get(defaultCategorie) / count * 100).toFixed(0)} %`],
      ...categoriesConfig.map(c => [c.label, `${totals.get(c.label)}`, `${(totals.get(c.label) / count * 100).toFixed(0)} %`]),
    ]
  ));

  console.log('\n### Statuts\n');
  const statutsAAfficher = type === 'notResolved' ? statutsLabels.filter(s => s.label !== 'Fermé') : statutsLabels;
  console.log(toMarkdownTable(
    ['Statut', ...categorieLabels],
    statutsAAfficher.map(s => [s.label, ...categorieLabels.map(label => `${categories.get(label).find(x => x.value === s.value).count}`)])
  ));

  console.log('\n### Opérateurs\n');
  const instructeurs = [
    ...userIdAssigned.filter(i => i.count > 0).map(i => [i.user, `${i.count}`]),
    ...[...unknownAssigned.values()].map(i => [`${i.label} (id : ${i.id})`, `${i.count}`]),
  ].sort((a, b) => a[0].localeCompare(b[0]));
  console.log(toMarkdownTable(['Opérateur', 'Conversations'], instructeurs));

  const tags = [...allSegments.entries()].sort((a, b) => b[1] - a[1]).map(([tag, n]) => [tag, `${n}`]);
  console.log(`\n### Tags rencontrés (${tags.length})\n`);
  console.log(toMarkdownTable(['Tag', 'Conversations'], tags));

  await new Promise((resolve, reject) => {
    file.end(err => (err ? reject(err) : resolve()));
  });
});
