const getStatsDoms = async (db, query) => {


  let statsDom = await db.collection('cras').aggregate(
    [
      { $match: { ...query,
        $and: [
          { 'cra.codePostal': { $regex: /(?:^97)|(?:^98)/ } },
          { 'cra.codePostal': { $ne: '97150' } },
        ] } },
      { $group: { _id: {
        departement: { $substr: ['$cra.codePostal', 0, 3] }, //ici on prend les 3 premiers chiffres du DOM
        year: { $year: '$createdAt' },
        month: { $month: '$createdAt' } },
      count: { $sum: {
        $cond: [{ '$gt': ['$cra.nbParticipants', 0] }, '$cra.nbParticipants', 1] //Si nbParticipants alors c'est collectif sinon 1
      } } } },
      { $project: { 'departement': '$departement', 'mois': '$month', 'annee': '$year', 'valeur': '$count' } }
    ]
  ).toArray();

  return statsDom;

};

module.exports = { getStatsDoms };
