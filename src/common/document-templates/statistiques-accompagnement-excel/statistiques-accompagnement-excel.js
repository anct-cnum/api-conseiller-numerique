const xl = require('excel4node');
const cors = require('cors');
const dayjs = require('dayjs');
const formatDate = (date, separator = '/') => dayjs(new Date(date)).format(`DD${separator}MM${separator}YYYY`);
const labelsCorrespondance = require('../../../services/stats/data/themesCorrespondances.json');

const mois = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];

const general = (ws, statistiques) => {
  ws.cell(3, 1).string('Général');
  ws.cell(4, 1).string('Personnes totales accompagnées durant cette période');
  ws.cell(5, 1).string('Accompagnements totaux enregistrés (dont récurrent)');
  ws.cell(6, 1).string('Ateliers réalisés');
  ws.cell(7, 1).string('Total des participants aux ateliers');
  ws.cell(8, 1).string('Accompagnements individuels');
  ws.cell(9, 1).string('Demandes ponctuelles');
  ws.cell(10, 1).string('Accompagnements avec suivi');
  ws.cell(11, 1).string('Pourcentage du total des usagers accompagnés sur cette période');
  ws.cell(12, 1).string('Accompagnements individuels');
  ws.cell(13, 1).string('Accompagnements en atelier collectif');
  ws.cell(14, 1).string('Redirections vers une autre structure agréée');
  ws.cell(4, 2).number(
    statistiques.nbTotalParticipant + statistiques.nbAccompagnementPerso + statistiques.nbDemandePonctuel - statistiques.nbParticipantsRecurrents
  );
  ws.cell(5, 2).number(statistiques.nbTotalParticipant + statistiques.nbAccompagnementPerso + statistiques.nbDemandePonctuel);
  ws.cell(6, 2).number(statistiques.nbAteliers);
  ws.cell(7, 2).number(statistiques.nbTotalParticipant);
  ws.cell(8, 2).number(statistiques.nbAccompagnementPerso);
  ws.cell(9, 2).number(statistiques.nbDemandePonctuel);
  ws.cell(10, 2).number(statistiques.nbUsagersBeneficiantSuivi);
  ws.cell(11, 2).number(statistiques.tauxTotalUsagersAccompagnes);
  ws.cell(12, 2).number(statistiques.nbUsagersAccompagnementIndividuel);
  ws.cell(13, 2).number(statistiques.nbUsagersAtelierCollectif);
  ws.cell(14, 2).number(statistiques.nbReconduction);

  return ws;
};

const statsThemes = (ws, statistiques) => {
  ws.cell(16, 1).string('Thèmes des accompagnements');
  statistiques.statsThemes.forEach((theme, i) => {
    ws.cell(17 + i, 1).string(labelsCorrespondance.find(label => label.nom === theme.nom)?.correspondance ?? theme.nom);
    ws.cell(17 + i, 2).number(theme.valeur);
  });
  return ws;
};

const statsLieux = (ws, statistiques, isAdminCoop) => {
  ws.cell(33, 1).string(`Canaux d'accompagnements${isAdminCoop === true ? ' (en %)' : ''}`);
  [
    'À domicile',
    'À distance',
    'Lieu de rattachement',
    'Autre'
  ].forEach((statLieux, i) => {
    ws.cell(34 + i, 1).string(statLieux);
    ws.cell(34 + i, 2).number(statistiques.statsLieux[i].valeur);
  });
  return ws;
};

const statsDurees = (ws, statistiques) => {
  ws.cell(39, 1).string('Durée des accompagnements');
  [
    'Moins de 30 minutes',
    '30-60 minutes',
    '60-120 minutes',
    'Plus de 120 minutes'
  ].forEach((statsDuree, i) => {
    ws.cell(40 + i, 1).string(statsDuree);
    ws.cell(40 + i, 2).number(statistiques.statsDurees[i].valeur);
  });
  return ws;
};

const statsAges = (ws, statistiques) => {
  ws.cell(45, 1).string('Tranches d’âge des usagers (en %)');
  [
    'Moins de 12 ans',
    '12-18 ans',
    '18-35 ans',
    '35-60 ans',
    'Plus de 60 ans'
  ].forEach((statsAge, i) => {
    ws.cell(46 + i, 1).string(statsAge);
    ws.cell(46 + i, 2).number(statistiques.statsAges[i].valeur);
  });
  return ws;
};

const statsUsagers = (ws, statistiques) => {
  ws.cell(52, 1).string('Statut des usagers (en %)');
  [
    'Scolarisé(e)',
    'Sans emploi',
    'En emploi',
    'Retraité',
    'Non renseigné'
  ].forEach((statsUsager, i) => {
    ws.cell(53 + i, 1).string(statsUsager);
    ws.cell(53 + i, 2).number(statistiques.statsUsagers[i].valeur);
  });
  return ws;
};

const statsEvolutions = (ws, statistiques) => {
  ws.cell(59, 1).string('Évolution des comptes rendus d\'activité');
  let y = 0;
  Object.keys(statistiques.statsEvolutions).forEach((year, i) => {
    if (i > 0) {
      y = 2;
    }
    ws.cell(60, 1 + y).string(year);
    const statsEvolutions = statistiques.statsEvolutions[year].sort((statEvolutionA, statEvolutionB) => statEvolutionA.mois - statEvolutionB.mois);
    statsEvolutions.forEach((data, y) => {
      const moisStats = mois[data.mois];
      ws.cell(61 + y, 1 + y).string(moisStats);
      ws.cell(61 + y, 2 + y).number(data.totalCras);
    });
  });
  return ws;
};

const statsReorientations = (ws, statistiques) => {
  let size = 0;
  Object.keys(statistiques.statsEvolutions).forEach(year => {
    if (size < statistiques.statsEvolutions[year].length) {
      size = statistiques.statsEvolutions[year].length;
    }
  });
  ws.cell(62 + size, 1).string('Usager.ères réorienté.es (en %)');
  let valeurFinale = 0;
  statistiques.statsReorientations.forEach((reorientation, i) => {
    valeurFinale += reorientation.valeur;
    ws.cell(63 + i + size, 1).string(reorientation.nom);
    ws.cell(63 + i + size, 2).number(Number((reorientation.valeur).toFixed(2)));
  });
  if (valeurFinale !== 100) {
    ws.cell(63 + statistiques.statsReorientations.length + size, 1).string('Saisie vide');
    ws.cell(63 + statistiques.statsReorientations.length + size, 2).number(Number((100 - valeurFinale).toFixed(2)));
  }
  return ws;
};

const buildExportStatistiquesExcelFileContent = (app, res, statistiques, dateDebut, dateFin, type, idType, codePostal, ville, isAdminCoop) => {
  app.use(cors({ exposedHeaders: '*' }));
  const wb = new xl.Workbook();
  let ws = wb.addWorksheet('Statistiques d\'accompagnement');
  //Titre
  codePostal = codePostal ?? '';
  ville = ville ?? '';
  idType = idType ?? '';
  ws.cell(1, 1).string(
    ['Statistiques', type, codePostal, ville, idType, formatDate(dateDebut).toLocaleString()].join(' ') + '-' + formatDate(dateFin).toLocaleString()
  );
  ws = general(ws, statistiques);
  ws = statsThemes(ws, statistiques);
  ws = statsLieux(ws, statistiques, isAdminCoop);
  ws = statsDurees(ws, statistiques);
  ws = statsAges(ws, statistiques);
  ws = statsUsagers(ws, statistiques);
  ws = statsEvolutions(ws, statistiques);
  if (statistiques.statsReorientations.length > 0) {
    ws = statsReorientations(ws, statistiques);
  }
  wb.write('Excel.xlsx', res);
};

module.exports = {
  buildExportStatistiquesExcelFileContent
};
