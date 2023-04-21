const getStatsTempsAccompagnements = async (db, query) => {
  let tempsAccompagnement = [
    { nom: 'individuel', valeur: 0 },
    { nom: 'collectif', valeur: 0 },
    { nom: 'ponctuel', valeur: 0 }
  ];

  const tempsAccompagnementArray = await db.collection('cras').aggregate(
    [
      { $unwind: '$cra.duree' },
      { $match: { ...query } },
      { $group: { _id: '$cra.activite', count: { $sum: {
        $switch: {
          branches:
          [
            { case: { $eq: ['$cra.duree', '0-30'] }, then: 30 },
            { case: { $eq: ['$cra.duree', '30-60'] }, then: 60 },
            { case: { $eq: ['$cra.duree', '60'] }, then: 60 },
            { case: { $eq: ['$cra.duree', '90'] }, then: 90 },
          ],
          default: '$cra.duree'
        } } } } },
      { $project: { '_id': 0, 'nom': '$_id', 'valeur': '$count' } }
    ]
  ).toArray();

  tempsAccompagnement.forEach((temps, i) => {
    if (tempsAccompagnementArray.find(tpsAcc => tpsAcc.nom === temps.nom)) {
      tempsAccompagnement[i].valeur = tempsAccompagnementArray.find(tpsAcc => tpsAcc.nom === temps.nom).valeur;
    }
  });

  //Temps en heure
  let total = 0;
  await tempsAccompagnement.forEach(temps => {
    temps.valeur = temps.valeur === 0 ? 0 : Math.round(temps.valeur / 60);
    total += temps.valeur;
  });
  await tempsAccompagnement.forEach(temps => {
    temps.pourcent = temps.valeur > 0 && total > 0 ? Number((temps.valeur * 100 / total).toFixed(1)) : 0;
  });
  tempsAccompagnement.unshift({ nom: 'total', valeur: total });

  return tempsAccompagnement;
};
module.exports = { getStatsTempsAccompagnements };
