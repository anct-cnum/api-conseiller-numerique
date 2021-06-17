const getStatsAccompagnements = async (db, query) => {

  let statsAccompagnements = await db.collection('cras').aggregate(
    [
      { $unwind: '$cra.accompagnement' },
      { $match: { ...query } },
      { $group: { _id: '$cra.accompagnement', count: { $sum: {
        $cond: [{ '$gt': ['$cra.nbParticipants', 0] }, '$cra.nbParticipants', 1] //Si nbParticipants alors c'est collectif sinon 1
      } } } },
    ]
  ).toArray();

  return statsAccompagnements;

};

module.exports = { getStatsAccompagnements };
