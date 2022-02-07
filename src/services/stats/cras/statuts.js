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
      { $match: { ...query } },
      { $group: {
        _id: 'statut',
        etudiant: { $sum: '$cra.statut.etudiant' },
        sansEmploi: { $sum: '$cra.statut.sansEmploi' },
        enEmploi: { $sum: '$cra.statut.enEmploi' },
        retraite: { $sum: '$cra.statut.retraite' },
        heterogene: { $sum: '$cra.statut.heterogene' },
      } },
      { $project: { '_id': 0, 'etudiant': '$etudiant',
        'sansEmploi': '$sansEmploi', 'enEmploi': '$enEmploi',
        'retraite': '$retraite', 'heterogene': '$heterogene'
      } }
    ]
  ).toArray();

  if (statuts.length > 0) {
    statsUsagers = [
      { nom: 'etudiant', valeur: statuts[0].etudiant },
      { nom: 'sans emploi', valeur: statuts[0].sansEmploi },
      { nom: 'en emploi', valeur: statuts[0].enEmploi },
      { nom: 'retraite', valeur: statuts[0].retraite },
      { nom: 'heterogene', valeur: statuts[0].heterogene },
    ];
  }

  //Conversion en % total
  statsUsagers = statsUsagers.map(statut => {
    console.log(statut.valeur / totalParticipants * 100);
    statut.valeur = totalParticipants > 0 ? ~~(statut.valeur / totalParticipants * 100) : 0;
    return statut;
  });

  return statsUsagers;

};

module.exports = { getStatsStatuts };
