const getStatsReorientations = async (db, query, totalReorientations) => {

  let statsReorientations = await db.collection('cras').aggregate(
    [
      { $unwind: '$cra.accompagnement' },
      { $match: { ...query, 'cra.organisme': { '$ne': null } } },
      { $group: { _id: '$cra.organisme', redirection: { $sum: '$cra.accompagnement.redirection' } } },
      { $project: { '_id': 0, 'organisme': '$_id', 'redirection': '$redirection' } }
    ]
  ).toArray();

  //Conversion en % total
  console.log(totalReorientations);
  console.log(statsReorientations);
  statsReorientations = statsReorientations.map(lieu => {
    lieu.redirection = totalReorientations > 0 ? ~~(lieu.redirection / totalReorientations * 100) : 0;
    return lieu;
  });
  console.log(statsReorientations);
  return statsReorientations;

};

module.exports = { getStatsReorientations };
