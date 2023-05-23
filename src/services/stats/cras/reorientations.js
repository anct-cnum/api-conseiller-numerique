const getStatsReorientations = async (db, query) => {
  let statsReorientations = await db.collection('cras').aggregate(
    [
      { $unwind: '$cra.organismes' },
      { $match: { ...query, 'cra.organismes': { '$ne': null } } },
      { $group: { 'keys': { $objectToArray: '$cra.organismes' } } },
      { $project: { '_id': 0, 'organismes': '$cra.organismes', 'keys': '$keys' } }
    ]
  ).toArray();

  let reorientations = [];
  let totalReorientations = 0;
  statsReorientations.forEach(statsReorientation => {
    if (reorientations.filter(reorientation => reorientation.nom === String(Object.keys(statsReorientation.organismes)[0]))?.length > 0) {
      reorientations.filter(reorientation => reorientation.nom === Object.keys(statsReorientation.organismes)[0])[0].valeur +=
        statsReorientation.organismes[Object.keys(statsReorientation.organismes)[0]];
    } else {
      reorientations.push({
        nom: String(Object.keys(statsReorientation.organismes)[0]),
        valeur: statsReorientation.organismes[Object.keys(statsReorientation.organismes)[0]]
      });
    }
    totalReorientations += statsReorientation.organismes[Object.keys(statsReorientation.organismes)[0]];
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
