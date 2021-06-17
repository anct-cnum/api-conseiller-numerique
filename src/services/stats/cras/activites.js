const getStatsActivites = async (db, query) => {

  let statsActivites = await db.collection('cras').aggregate(
    [
      { $unwind: '$cra.activite' },
      { $match: { ...query } },
      { $group: { _id: '$cra.activite', count: { $sum: 1 }, nbParticipants: { $sum: '$cra.nbParticipants' } } },
    ]
  ).toArray();

  return statsActivites;

};

module.exports = { getStatsActivites };
