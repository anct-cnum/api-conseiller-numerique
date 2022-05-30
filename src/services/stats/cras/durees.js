const getStatsDurees = async (db, query) => {

  let statsDurees = [
    { nom: '0-30', valeur: 0 },
    { nom: '30-60', valeur: 0 },
    { nom: '60-120', valeur: 0 },
    { nom: '120+', valeur: 0 },
  ];
  //Gestion des categories 0-30 / 30-60
  let durees = await db.collection('cras').aggregate(
    [
      { $unwind: '$cra.duree' },
      { $match: { ...query, 'cra.duree': { $in: ['0-30', '30-60'] } } },
      { $group: { _id: '$cra.duree', count: { $sum: 1 } } },
      { $project: { '_id': 0, 'nom': '$_id', 'valeur': '$count' } }
    ]
  ).toArray();

  if (durees.length > 0) {
    statsDurees = statsDurees.map(duree1 => durees.find(duree2 => duree1.nom === duree2.nom) || duree1);
  }


  //Ajout du cas spécifique 60 à 120 minutes
  let duree60 = await db.collection('cras').aggregate(
    [
      { $match: { ...query,
        $and: [
          { 'cra.duree': { $ne: ['0-30', '30-60'] } },
          { $or: [
            { 'cra.duree': {
              $gte: 60,
              $lt: 120,
            } },
            { 'cra.duree': { $eq: '60' } } //Correspond au bouton 1h pile
          ] }
        ],
      } },
      { $group: { _id: null, total: { $sum: 1 } } }
    ]
  ).toArray();
  statsDurees[statsDurees.findIndex(duree => duree.nom === '60-120')].valeur = duree60.length !== 0 ? duree60[0].total : 0;

  //Ajout du cas spécifique > 120 minutes
  let duree120 = await db.collection('cras').aggregate(
    [
      { $match: { ...query,
        $and: [
          { 'cra.duree': { $ne: ['0-30', '30-60'] } },
          { 'cra.duree': {
            $gte: 120,
          } }
        ],
      } },
      { $group: { _id: null, total: { $sum: 1 } } }
    ]
  ).toArray();
  statsDurees[statsDurees.findIndex(duree => duree.nom === '120+')].valeur = duree120.length !== 0 ? duree120[0].total : 0;

  return statsDurees;

};

module.exports = { getStatsDurees };
