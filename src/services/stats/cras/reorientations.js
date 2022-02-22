const getStatsReorientations = async (db, query, totalReorientations) => {

  let statsReorientations = [];

  let reorientations = await db.collection('cras').aggregate(
    [
      { $unwind: '$cra.accompagnement' },
      { $match: { ...query, 'cra.organisme': { '$ne': null } } },
      { $group: {
        _id: '$cra.organisme',
        redirection: { $sum: '$cra.accompagnement.redirection' },
      } },
      { $project: { '_id': '$cra.organisme', 'count': '$count' } }
    ]
  ).toArray();
  if (reorientations.length > 0) {
    console.log(reorientations);
    console.log(query);
  }

  //Conversion en % total
  statsReorientations = statsReorientations.map(lieu => {
    lieu.count = totalReorientations > 0 ? ~~(lieu.count / totalReorientations * 100) : 0;
    return lieu;
  });

  return statsReorientations;

};

module.exports = { getStatsReorientations };
