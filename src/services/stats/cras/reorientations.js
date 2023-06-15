const getStatsReorientations = async (db, query) => {
  let statsReorientations = await db.collection('cras').aggregate(
    [
      { $unwind: '$cra.organismes' },
      { $match: { ...query, 'cra.organismes': { '$ne': null } } },
      { $addFields: { 'organismeTab': { $objectToArray: '$cra.organismes' } } },
      { $unwind: '$organismeTab' },
      { $group: { '_id': '$organismeTab.k', 'count': { '$sum': '$organismeTab.v' } } },
      { $project: { '_id': 1, 'count': 1 } }
    ]
  ).toArray();

  let reorientations = [];
  let totalReorientations = 0;
  statsReorientations.forEach(statsReorientation => {
    totalReorientations += statsReorientation.count;
    reorientations.push({
      nom: statsReorientation._id,
      valeur: statsReorientation.count
    });
  });

  //Conversion en % total
  if (reorientations.length > 0) {
    return reorientations.map(lieu => {
      lieu.valeur = totalReorientations > 0 ? Number((lieu.valeur / totalReorientations * 100).toFixed(2)) : 0;
      return lieu;
    });
  }

  return reorientations;
};

module.exports = { getStatsReorientations };
