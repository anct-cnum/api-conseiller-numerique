const getStatsCorse2B = async (db, query) => {

  await db.collection('cras').aggregate(
    [
      { $match: { ...query, 'cra.codePostal': { $regex: /(?:^202)|(?:^206)/ } } },
      { $group: { _id: {
        departement: '2B', //ici on passe en 2B
        year: { $year: '$createdAt' },
        month: { $month: '$createdAt' } },
      count: { $sum: {
        $cond: [{ '$gt': ['$cra.nbParticipants', 0] }, '$cra.nbParticipants', 1] //Si nbParticipants alors c'est collectif sinon 1
      } } } },
      { $project: { 'departement': '$departement', 'mois': '$month', 'annee': '$year', 'valeur': '$count' } },
      { $out: 'temporary_corse2b_stats_departements_cras' }
    ]
  ).toArray(); //besoin du toArray même avec $out pour l'iteration du curseur mais renverra un tableau vide

};

module.exports = { getStatsCorse2B };
