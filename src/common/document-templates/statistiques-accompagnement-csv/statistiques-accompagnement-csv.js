const dayjs = require('dayjs');
const formatDate = (date, separator = '/') => dayjs(new Date(date)).format(`DD${separator}MM${separator}YYYY`);
const labelsCorrespondance = require('../../../services/stats/data/themesCorrespondances.json');

const general = statistiques => [
  'Général',
  `Personnes totales accompagnées durant cette période;${statistiques.nbTotalParticipant + statistiques.nbAccompagnementPerso +
    statistiques.nbDemandePonctuel - statistiques.nbParticipantsRecurrents}`,
  `Accompagnements totaux enregistrés (dont récurrent);${statistiques.nbTotalParticipant +
    statistiques.nbAccompagnementPerso + statistiques.nbDemandePonctuel}`,
  `Ateliers réalisés;${statistiques.nbAteliers}`,
  `Total des participants aux ateliers;${statistiques.nbTotalParticipant}`,
  `Accompagnements individuels;${statistiques.nbAccompagnementPerso}`,
  `Demandes ponctuelles;${statistiques.nbDemandePonctuel}`,
  `Accompagnements avec suivi;${statistiques.nbUsagersBeneficiantSuivi}`,
  `Pourcentage du total des usagers accompagnés sur cette période;${statistiques.tauxTotalUsagersAccompagnes}`,
  `Accompagnements individuels;${statistiques.nbUsagersAccompagnementIndividuel}`,
  `Accompagnements en atelier collectif;${statistiques.nbUsagersAtelierCollectif}`,
  `Redirections vers une autre structure agréée;${statistiques.nbReconduction}\n`
];

const statsThemes = statistiques => [
  'Thèmes des accompagnements',
  ...statistiques.statsThemes.map(theme => `${labelsCorrespondance.find(label => label.nom === theme.nom)?.correspondance ?? theme.nom};${theme.valeur}`),
  ''
];

const statsLieux = (statistiques, isAdminCoop) => [
  `Canaux d'accompagnements${isAdminCoop === true ? ' (en %)' : ''}`,
  ...[
    'À domicile',
    'À distance',
    'Lieu de rattachement',
    'Autre'
  ].map((statLieux, index) => `${statLieux};${statistiques.statsLieux[index].valeur}`),
  ''
];

const statsDurees = statistiques => [
  'Durée des accompagnements',
  ...[
    'Moins de 30 minutes',
    '30-60 minutes',
    '60-120 minutes',
    'Plus de 120 minutes'
  ].map((statsDuree, index) => `${statsDuree};${statistiques.statsDurees[index].valeur}`),
  ''
];

const statsAges = statistiques => [
  'Tranches d’âge des usagers (en %)',
  ...[
    'Moins de 12 ans',
    '12-18 ans',
    '18-35 ans',
    '35-60 ans',
    'Plus de 60 ans'
  ].map((statsAge, index) => `${statsAge};${statistiques.statsAges[index].valeur}`),
  ''
];

const statsUsagers = statistiques => [
  'Statut des usagers (en %)',
  ...[
    'Scolarisé(e)',
    'Sans emploi',
    'En emploi',
    'Retraité',
    'Non renseigné'
  ].map((statsUsager, index) => `${statsUsager};${statistiques.statsUsagers[index].valeur}`),
  ''
];

const mois = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];

const statsEvolutions = statistiques => [
  'Évolution des comptes rendus d\'activité',
  ...Object.keys(statistiques.statsEvolutions).map(year => [
    year,
    ...statistiques.statsEvolutions[year]
    .sort((statEvolutionA, statEvolutionB) => statEvolutionA.mois - statEvolutionB.mois)
    .map(orderedStatEvolution => `${mois[orderedStatEvolution.mois]};${orderedStatEvolution.totalCras}`),
    ''
  ]).flat()
];

const statsReorientations = statistiques => {
  let reorientation = 'Usager.ères réorienté.es (en %)';
  statistiques.statsReorientations.forEach(statReorientation => {
    reorientation += `\n${statReorientation.nom};${Number(statReorientation.valeur)}`;
  });

  return reorientation;
};

const statsReorientationsVide = statistiques => {
  let valeur = 0;
  statistiques.statsReorientations.forEach(lieu => {
    valeur += lieu.valeur;
  });
  return `Lieu vide;${Number((100 - valeur).toFixed(2))}`;
};

const buildExportStatistiquesCsvFileContent = (statistiques, dateDebut, dateFin, type, idType, codePostal, ville, isAdminCoop) => [
  '\ufeff', //ufeff pour BOM UTF-8
  `Statistiques ${type} ${codePostal ?? ''} ${ville ?? ''} ${idType ?? ''} ${formatDate(dateDebut).toLocaleString()}-${formatDate(dateFin).toLocaleString()}\n`,
  ...general(statistiques),
  ...statsThemes(statistiques),
  ...statsLieux(statistiques, isAdminCoop),
  ...statsDurees(statistiques),
  ...statsAges(statistiques),
  ...statsUsagers(statistiques),
  ...statsEvolutions(statistiques),
  statistiques.statsReorientations.length > 0 ? statsReorientations(statistiques) : '',
  statistiques.statsReorientations.length > 0 ? statsReorientationsVide(statistiques) : '',
].join('\n');

module.exports = {
  buildExportStatistiquesCsvFileContent
};
