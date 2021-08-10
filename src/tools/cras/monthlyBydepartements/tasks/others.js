const getStatsAllOthers = async (db, query) => {

  await db.collection('cras').aggregate(
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
      { $project: { 'departement': '$departement', 'mois': '$month', 'annee': '$year', 'valeur': '$count' } },
      { $out: 'temporary_others_stats_departements_cras' }
    ]
  ).toArray(); //besoin du toArray même avec $out pour l'iteration du curseur mais renverra un tableau vide

};

module.exports = { getStatsAllOthers };
