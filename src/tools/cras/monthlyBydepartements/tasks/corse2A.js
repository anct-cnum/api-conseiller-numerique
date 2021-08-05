const getStatsCorse2A = async (db, query) => {

  let statsCorse2A = await db.collection('cras').aggregate(
    [
      { $match: { ...query, 'cra.codePostal': { $regex: /(?:^200)|(?:^201)/ } } },
      { $group: { _id: {
        departement: '2A', //ici on passe en 2A
        year: { $year: '$createdAt' },
        month: { $month: '$createdAt' } },
      count: { $sum: {
        $cond: [{ '$gt': ['$cra.nbParticipants', 0] }, '$cra.nbParticipants', 1] //Si nbParticipants alors c'est collectif sinon 1
      } } } },
      { $project: { 'departement': '$departement', 'mois': '$month', 'annee': '$year', 'valeur': '$count' } }
    ]
  ).toArray();

  return statsCorse2A;

};

module.exports = { getStatsCorse2A };
