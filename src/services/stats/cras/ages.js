const getStatsAges = async (db, query, totalParticipants) => {

  let statsAges = [
    { nom: '-12', valeur: 0 },
    { nom: '12-18', valeur: 0 },
    { nom: '18-35', valeur: 0 },
    { nom: '35-60', valeur: 0 },
    { nom: '+60', valeur: 0 },
  ];

  let ages = await db.collection('cras').aggregate(
    [
      { $unwind: '$cra.age' },
      { $match: { ...query } },
      { $group: { _id: '$cra.age', count: { $sum: '$cra.nbParticipants' } } },
      { $project: { '_id': 0, 'nom': '$_id', 'valeur': '$count' } }
    ]
  ).toArray();

  if (ages.length > 0) {
    statsAges = statsAges.map(age1 => ages.find(age2 => age1.nom === age2.nom) || age1);
  }

  //Conversion en % total
  statsAges = statsAges.map(age => {
    age.valeur = totalParticipants > 0 ? ~~(age.valeur / totalParticipants * 100) : 0;
    return age;
  });

  return statsAges;

};

module.exports = { getStatsAges };
