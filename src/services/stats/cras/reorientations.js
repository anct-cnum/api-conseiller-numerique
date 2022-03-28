const getStatsReorientations = async (db, query) => {

  let statsReorientations = await db.collection('cras').aggregate(
    [
      { $unwind: '$cra.accompagnement' },
      { $match: { ...query, 'cra.organisme': { '$ne': null } } },
      { $group: { _id: '$cra.organisme', redirection: { $sum: '$cra.accompagnement.redirection' } } },
      { $project: { '_id': 0, 'nom': '$_id', 'valeur': '$redirection' } }
    ]
  ).toArray();

  const totalReorientations = statsReorientations.reduce(
    (previousValue, currentValue) => previousValue + currentValue.valeur,
    0
  );

  //Conversion en % total
  if (statsReorientations.length > 0) {
    return statsReorientations.map(lieu => {
      lieu.valeur = totalReorientations > 0 ? ~~(lieu.valeur / totalReorientations * 100) : 0;
      return lieu;
    });
  }
  return statsReorientations;
};

module.exports = { getStatsReorientations };
