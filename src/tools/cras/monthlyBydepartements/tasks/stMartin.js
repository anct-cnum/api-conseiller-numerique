const getStatsStMartin = async (db, query) => {

  let statsStMartin = await db.collection('cras').aggregate(
    [
      { $match: { ...query, 'cra.codePostal': { $eq: '97150' } } },
      { $group: { _id: {
        departement: '97150', //on taggue donc ici en 97150
        year: { $year: '$createdAt' },
        month: { $month: '$createdAt' } },
      count: { $sum: {
        $cond: [{ '$gt': ['$cra.nbParticipants', 0] }, '$cra.nbParticipants', 1] //Si nbParticipants alors c'est collectif sinon 1
      } } } },
      { $project: { 'departement': '$departement', 'mois': '$month', 'annee': '$year', 'valeur': '$count' } }
    ]
  ).toArray();

  return statsStMartin;

};

module.exports = { getStatsStMartin };
