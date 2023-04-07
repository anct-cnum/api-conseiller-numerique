const getStatsTempsAccompagnements = async (db, query) => {
  let promises = [];
  let tempsAccompagnement = [
    { nom: 'individuel', valeur: 0 },
    { nom: 'collectif', valeur: 0 },
    { nom: 'ponctuel', valeur: 0 }
  ];

  //Gestion des nombres >= 60
  const tempsAccompagnementTranche = await db.collection('cras').aggregate(
    [
      { $unwind: '$cra.duree' },
      { $match: { ...query, 'cra.duree': { $ne: ['0-30', '30-60', '60', '90'] } } },
      { $group: { _id: '$cra.activite', count: { $sum: '$cra.duree' } } },
      { $project: { '_id': 0, 'nom': '$_id', 'valeur': '$count' } }
    ]
  ).toArray();

  //Gestion des categories '0-30' / '30-60' / '60' / '90'
  await tempsAccompagnementTranche.forEach(async activite => {
    promises.push(new Promise(async resolve => {
      tempsAccompagnement.find(accompagnement => accompagnement.nom === activite.nom).valeur += activite.valeur;
      let dureesString = await db.collection('cras').aggregate(
        [
          { $unwind: '$cra.duree' },
          { $match: { ...query, 'cra.activite': activite.nom, 'cra.duree': { $in: ['0-30', '30-60', '60', '90'] } } },
          { $group: { _id: '$cra.duree', count: { $sum: 1 } } },
          { $project: { '_id': 0, 'nom': '$_id', 'valeur': '$count' } }
        ]
      ).toArray();

      // Ajout des heures par activité
      if (dureesString?.length > 0) {
        await dureesString.forEach(async duree => {
          let valeurString = 0;
          if (duree.nom === '0-30') {
            valeurString = 30 * duree?.valeur;
          }
          if (duree.nom === '30-60' || duree.nom === '60') {
            valeurString = 60 * duree?.valeur;
          }
          if (duree.nom === '90') {
            valeurString = 90 * duree?.valeur;
          }
          tempsAccompagnement.find(accompagnement => accompagnement.nom === activite.nom).valeur += valeurString;
        });
      }
      resolve();
    }));
  });
  await Promise.all(promises);

  //Temps en minutes
  let total = 0;
  await tempsAccompagnement.forEach(temps => {
    temps.valeur = temps.valeur === 0 ? 0 : Math.round(temps.valeur / 60);
    total += temps.valeur;
  });
  tempsAccompagnement.unshift({ nom: 'total', valeur: total });

  return tempsAccompagnement;
};
module.exports = { getStatsTempsAccompagnements };
