const getPersonnesRecurrentes = async (db, query) => {

  let personnesRecurrentes = await db.collection('cras').aggregate(
    { $match: { ...query } },
    { $group: { _id: null, count: { $sum: '$cra.nbParticipantsRecurrents' } } },
    { $project: { 'valeur': '$count' } }
  ).toArray();

  return personnesRecurrentes;

};

module.exports = { getPersonnesRecurrentes };
