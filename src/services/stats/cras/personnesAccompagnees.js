const getPersonnesAccompagnees = async (db, query) => {

  let personnesAccompagnees = await db.collection('cras').aggregate(
    { $match: { ...query } },
    { $group: { _id: null, count: { $sum: { $cond: [{ '$gt': ['$cra.nbParticipants', 0] }, '$cra.nbParticipants', 1] } } } },
    { $project: { 'valeur': '$count' } }
  ).toArray();

  return personnesAccompagnees;

};

module.exports = { getPersonnesAccompagnees };
