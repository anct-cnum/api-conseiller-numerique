const getStatsAllOthers = async (db, query) => {


  let statsAllOthers = await db.collection('cras').aggregate(
    [
      { $match: { ...query,
        $and: [
          { 'cra.codePostal': { $not: /(?:^97)|(?:^98)/ } }, // On enlève tous les cas particuliers
          { 'cra.codePostal': { $not: /(?:^20)/ } },
        ] } },
      { $group: { _id: {
        departement: { $substr: ['$cra.codePostal', 0, 2] }, //On prend les 2 premiers chiffres du CP
        year: { $year: '$createdAt' },
        month: { $month: '$createdAt' } },
      count: { $sum: {
        $cond: [{ '$gt': ['$cra.nbParticipants', 0] }, '$cra.nbParticipants', 1] //Si nbParticipants alors c'est collectif sinon 1
      } } } },
      { $project: { 'departement': '$departement', 'mois': '$month', 'annee': '$year', 'valeur': '$count' } }
    ]
  ).toArray();

  return statsAllOthers;

};

module.exports = { getStatsAllOthers };
