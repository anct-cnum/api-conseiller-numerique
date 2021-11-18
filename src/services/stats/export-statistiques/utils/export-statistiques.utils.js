const Joi = require('joi');
const dayjs = require('dayjs');

const validateExportStatistiquesSchema = exportTerritoiresInput => Joi.object({
  dateDebut: Joi.date().required().error(new Error('La date de début est invalide')),
  dateFin: Joi.date().required().error(new Error('La date de fin est invalide')),
  type: Joi.string().required().error(new Error('Le type de territoire est invalide')),
  idType: Joi.required().error(new Error('L\'id du territoire invalide')),
}).validate(exportTerritoiresInput);

const exportStatistiquesQueryToSchema = query => {
  return {
    dateDebut: new Date(query.dateDebut),
    dateFin: new Date(query.dateFin),
    type: query.type,
    idType: query.idType
  };
};

const formatDate = (date, separator = '/') => dayjs(new Date(date)).format(`DD${separator}MM${separator}YYYY`);

const getExportStatistiquesFileName = (conseiller, dateDebut, dateFin) =>
  `Statistiques_${conseiller.prenom}_${conseiller.nom}_${formatDate(dateDebut, '-')}_${formatDate(dateFin, '-')}`;

const buildExportStatistiquesCsvFileContent = (statistiques, cnfsFullName, dateDebut, dateFin) => {
  const title = `Statistiques ${cnfsFullName} ${formatDate(dateDebut).toLocaleString()}-${formatDate(dateFin).toLocaleString()}\n`;

  const general = [
    'Général',
    `Personnes accompagnées durant cette période;${statistiques.nbAccompagnement}`,
    `Ateliers réalisés;${statistiques.nbAteliers}`,
    `Total des participants aux ateliers;${statistiques.nbTotalParticipant}`,
    `Accompagnements individuels;${statistiques.nbAccompagnementPerso}`,
    `Demandes ponctuelles;${statistiques.nbDemandePonctuel}`,
    `Usagers qui ont bénéficiés d'un accompagnement poursuivi;${statistiques.nbUsagersBeneficiantSuivi}`,
    `Pourcentage du total des usagers accompagnés sur cette période;${statistiques.tauxTotalUsagersAccompagnes}`,
    `Accompagnements individuels;${statistiques.nbUsagersAccompagnementIndividuel}`,
    `Accompagnements en atelier collectif;${statistiques.nbUsagersAtelierCollectif}`,
    `Redirections vers une autre structure agréée;${statistiques.nbReconduction}\n`
  ];

  const statsThemes = [
    'Thèmes des accompagnements',
    ...[
      'Équipement informatique',
      'Naviguer sur internet',
      'Courriels',
      'Applications smartphone',
      'Gestion de contenus numériques',
      'Env., vocab. Numérique',
      'Traitement de texte',
      'Échanger avec ses proches',
      'Emploi, formation',
      'Accompagner son enfant',
      'Numérique et TPE/PME',
      'Démarche en ligne',
      'Autre'
    ].map((statTheme, index) => `${statTheme};${statistiques.statsThemes[index].valeur}`),
    ''
  ];

  const statsLieux = [
    'Lieux des accompagnements',
    ...[
      'À domicile',
      'À distance',
      'Lieu de rattachement',
      'Autre'
    ].map((statLieux, index) => `${statLieux};${statistiques.statsLieux[index].valeur}`),
    ''
  ];

  const statsDurees = [
    'Durée des accompagnements',
    ...[
      'Moins de 30 minutes',
      '30-60 minutes',
      '60-120 minutes',
      'Plus de 120 minutes'
    ].map((statsDuree, index) => `${statsDuree};${statistiques.statsDurees[index].valeur}`),
    ''
  ];

  const statsAges = [
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

  const statsUsagers = [
    'Statut des usagers (en %)',
    ...[
      'Étudiant',
      'Sans emploi',
      'En emploi',
      'Retraité',
      'Non renseigné'
    ].map((statsUsager, index) => `${statsUsager};${statistiques.statsUsagers[index].valeur}`),
    ''
  ];

  const mois = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
  const statsEvolutions = [
    'Évolution des accompagnements',
    ...Object.keys(statistiques.statsEvolutions).map(year => [
      year,
      ...statistiques.statsEvolutions[year]
      .sort((statEvolutionA, statEvolutionB) => statEvolutionA.mois - statEvolutionB.mois)
      .map(orderedStatEvolution => `${mois[orderedStatEvolution.mois]};${orderedStatEvolution.totalCras}`),
      ''
    ]).flat()
  ];

  return [
    title,
    ...general,
    ...statsThemes,
    ...statsLieux,
    ...statsDurees,
    ...statsAges,
    ...statsUsagers,
    ...statsEvolutions
  ].join('\n');
};

module.exports = {
  validateExportStatistiquesSchema,
  exportStatistiquesQueryToSchema,
  getExportStatistiquesFileName,
  buildExportStatistiquesCsvFileContent
};
