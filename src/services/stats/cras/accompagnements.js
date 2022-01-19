const getStatsAccompagnements = async (db, query) => {

  let statsAccompagnements = await db.collection('cras').aggregate(
    [
      { $unwind: '$cra.accompagnement' },
      { $match: { ...query } },
      { $group: { _id: '$cra.accompagnement', count: '$cra.nbParticipants' } },
    ]
  ).toArray();

  return statsAccompagnements;

};

module.exports = { getStatsAccompagnements };
