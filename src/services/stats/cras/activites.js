const getStatsActivites = async (db, query) => {

  let statsActivites = await db.collection('cras').aggregate(
    [
      { $match: { ...query } },
      { $unwind: '$cra.activite' },
      { $group: { _id: '$cra.activite', count: { $sum: 1 }, nbParticipants: { $sum: '$cra.nbParticipants' } } },
    ]
  ).toArray();

  return statsActivites;

};

module.exports = { getStatsActivites };
