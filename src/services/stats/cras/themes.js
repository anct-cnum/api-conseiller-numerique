const getStatsThemes = async (db, query) => {

  let statsThemes = [
    { nom: 'equipement informatique', valeur: 0, pourcent: 0 },
    { nom: 'internet', valeur: 0, pourcent: 0 },
    { nom: 'courriel', valeur: 0, pourcent: 0 },
    { nom: 'smartphone', valeur: 0, pourcent: 0 },
    { nom: 'contenus numeriques', valeur: 0, pourcent: 0 },
    { nom: 'vocabulaire', valeur: 0, pourcent: 0 },
    { nom: 'traitement texte', valeur: 0, pourcent: 0 },
    { nom: 'echanger', valeur: 0, pourcent: 0 },
    { nom: 'trouver emploi', valeur: 0, pourcent: 0 },
    { nom: 'accompagner enfant', valeur: 0, pourcent: 0 },
    { nom: 'tpe/pme', valeur: 0, pourcent: 0 },
    { nom: 'demarche en ligne', valeur: 0, pourcent: 0 },
    { nom: 'securite', valeur: 0, pourcent: 0 },
    { nom: 'fraude et harcelement', valeur: 0, pourcent: 0 },
    { nom: 'sante', valeur: 0, pourcent: 0 },
    { nom: 'espace-sante', valeur: 0, pourcent: 0 },
    { nom: 'budget', valeur: 0, pourcent: 0 },
    { nom: 'scolaire', valeur: 0, pourcent: 0 },
    { nom: 'diagnostic', valeur: 0, pourcent: 0 },
  ];

  let themes = await db.collection('cras').aggregate(
    [
      { $match: { ...query } },
      { $unwind: '$cra.themes' },
      { $group: { _id: '$cra.themes', countCra: { $sum: 1 }, countAccompagnements: { $sum: '$cra.nbParticipants' } } },
      { $project: { '_id': 0, 'nom': '$_id', 'valeur': '$countAccompagnements' } }
    ]
  ).toArray();

  //Affichage temporaire pour la sous thématique Mon espace Santé
  let sousThemes = await db.collection('cras').aggregate(
    [
      { $match: { ...query, 'cra.sousThemes.sante': { '$in': ['espace-sante'] } } },
      { $unwind: '$cra.sousThemes' },
      { $group: { _id: 'espace-sante', totalCra: { $sum: 1 }, countAccompagnements: { $sum: '$cra.nbParticipants' } } },
      { $project: { '_id': 0, 'nom': '$_id', 'valeur': '$countAccompagnements' } }
    ]
  ).toArray();

  if (themes?.length > 0) {
    statsThemes = statsThemes.map(theme1 => themes.find(theme2 => theme1.nom === theme2.nom) || theme1);
    if (sousThemes?.length > 0) {
      statsThemes[15].valeur = sousThemes[0].valeur;
    }
  }

  // Pourcentage
  let total = await db.collection('cras').aggregate(
    [
      { $match: { ...query } },
      { $group: { _id: 'accompagnement', countAccompagnements: { $sum: '$cra.nbParticipants' } } }
    ]
  ).toArray();

  if (total[0].countAccompagnements > 0) {
    statsThemes.forEach(theme => {
      theme.pourcent = Number((theme.valeur > 0 ? theme.valeur * 100 / total[0].countAccompagnements : 0).toFixed(1));
    });
  }
  return statsThemes;
};

module.exports = { getStatsThemes };
