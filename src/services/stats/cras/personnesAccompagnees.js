const getPersonnesAccompagnees = async (db, query) => {

  let personnesAccompagnees = await db.collection('cras').aggregate(
    { $match: { ...query } },
    { $group: { _id: null, count: { $sum: '$cra.nbParticipants' } } },
    { $project: { 'valeur': '$count' } }
  ).toArray();

  return personnesAccompagnees;

};

module.exports = { getPersonnesAccompagnees };
