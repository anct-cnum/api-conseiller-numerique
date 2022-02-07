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
      { $match: { ...query } },
      { $group: {
        _id: 'age',
        moins12ans: { $sum: '$cra.age.moins12ans' },
        de12a18ans: { $sum: '$cra.age.de12a18ans' },
        de18a35ans: { $sum: '$cra.age.de18a35ans' },
        de35a60ans: { $sum: '$cra.age.de35a60ans' },
        plus60ans: { $sum: '$cra.age.plus60ans' },
      } },
      { $project: { '_id': 0, 'moins12ans': '$moins12ans',
        'de12a18ans': '$de12a18ans', 'de18a35ans': '$de18a35ans',
        'de35a60ans': '$de35a60ans', 'plus60ans': '$plus60ans'
      } }
    ]
  ).toArray();

  if (ages.length > 0) {
    statsAges = [
      { nom: '-12', valeur: ages[0].moins12ans },
      { nom: '12-18', valeur: ages[0].de12a18ans },
      { nom: '18-35', valeur: ages[0].de18a35ans },
      { nom: '35-60', valeur: ages[0].de35a60ans },
      { nom: '+60', valeur: ages[0].plus60ans },
    ];
  }

  //Conversion en % total
  statsAges = statsAges.map(age => {
    age.valeur = totalParticipants > 0 ? ~~(age.valeur / totalParticipants * 100) : 0;
    return age;
  });

  return statsAges;

};

module.exports = { getStatsAges };
