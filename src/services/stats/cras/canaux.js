const getStatsCanaux = async (db, query) => {

  let statsLieux = [
    { nom: 'domicile', valeur: 0 },
    { nom: 'distance', valeur: 0 },
    { nom: 'rattachement', valeur: 0 },
    { nom: 'autre', valeur: 0 },
  ];


  let lieux = await db.collection('cras').aggregate(
    [
      { $unwind: '$cra.canal' },
      { $match: { ...query } },
      { $group: { _id: '$cra.canal', count: { $sum: 1 } } },
      { $project: { '_id': 0, 'nom': '$_id', 'valeur': '$count' } }
    ]
  ).toArray();

  if (lieux.length > 0) {
    statsLieux = statsLieux.map(canal1 => lieux.find(canal2 => canal1.nom === canal2.nom) || canal1);
  }

  return statsLieux;

};

module.exports = { getStatsCanaux };
