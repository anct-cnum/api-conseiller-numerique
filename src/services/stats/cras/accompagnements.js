const getStatsAccompagnements = async (db, query) => {

  let statsAccompagnements = await db.collection('cras').aggregate(
    [
      { $unwind: '$cra.accompagnement' },
      { $match: { ...query } },
      { $group: {
        _id: 'accompagnement',
        individuel: { $sum: '$cra.accompagnement.individuel' },
        atelier: { $sum: '$cra.accompagnement.atelier' },
        redirection: { $sum: {
          $cond: [{ '$ne': ['$cra.organisme', null] }, '$cra.accompagnement.redirection', 0]
        } }
      } },
    ]
  ).toArray();

  return statsAccompagnements;

};

module.exports = { getStatsAccompagnements };
