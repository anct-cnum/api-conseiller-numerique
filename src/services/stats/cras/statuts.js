const getStatsStatuts = async (db, query, totalParticipants) => {

  let statsUsagers = [
    { label: ' test', nom: 'etudiant', valeur: 0 },
    { nom: 'sans emploi', valeur: 0 },
    { nom: 'en emploi', valeur: 0 },
    { nom: 'retraite', valeur: 0 },
    { nom: 'heterogene', valeur: 0 },
  ];

  let statuts = await db.collection('cras').aggregate(
    [
      { $unwind: '$cra.statut' },
      { $match: { ...query } },
      { $group: { _id: '$cra.statut', count: { $sum: {
        $cond: [{ '$gt': ['$cra.nbParticipants', 0] }, '$cra.nbParticipants', 1] //Si nbParticipants alors c'est collectif sinon 1
      } } } },
      { $project: { '_id': 0, 'nom': '$_id', 'valeur': '$count' } }
    ]
  ).toArray();

  if (statuts.length > 0) {
    statsUsagers = statsUsagers.map(statut1 => statuts.find(statut2 => statut1.nom === statut2.nom) || statut1);
  }

  //Conversion en % total
  statsUsagers = statsUsagers.map(statut => {
    statut.valeur = totalParticipants > 0 ? ~~(statut.valeur / totalParticipants * 100) : 0;
    return statut;
  });

  return statsUsagers;

};

module.exports = { getStatsStatuts };
