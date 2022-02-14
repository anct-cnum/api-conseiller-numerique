const getStatsThemes = async (db, query) => {

  let statsThemes = [
    { nom: 'equipement informatique', valeur: 0 },
    { nom: 'internet', valeur: 0 },
    { nom: 'courriel', valeur: 0 },
    { nom: 'smartphone', valeur: 0 },
    { nom: 'contenus numeriques', valeur: 0 },
    { nom: 'vocabulaire', valeur: 0 },
    { nom: 'traitement texte', valeur: 0 },
    { nom: 'echanger', valeur: 0 },
    { nom: 'trouver emploi', valeur: 0 },
    { nom: 'accompagner enfant', valeur: 0 },
    { nom: 'tpe/pme', valeur: 0 },
    { nom: 'demarche en ligne', valeur: 0 },
    /*
    { nom: 'securite', valeur: 0 },
    { nom: 'fraude et harcelement', valeur: 0 },
    { nom: 'sante', valeur: 0 },*/
  ];

  let themes = await db.collection('cras').aggregate(
    [
      { $unwind: '$cra.themes' },
      { $match: { ...query } },
      { $group: { _id: '$cra.themes', count: { $sum: 1 } } },
      { $project: { '_id': 0, 'nom': '$_id', 'valeur': '$count' } }
    ]
  ).toArray();

  if (themes.length > 0) {
    statsThemes = statsThemes.map(theme1 => themes.find(theme2 => theme1.nom === theme2.nom) || theme1);
  }

  return statsThemes;

};

module.exports = { getStatsThemes };
