const insertDailyCrasStats = async (db, query, logger, dateDebut) => {

  let totalCras = await db.collection('cras').countDocuments(query);

  const dailyCras = ({
    'date': dateDebut,
    'totalCras': totalCras,
  });

  //UpdateOne avec upsert pour insérer si non déjà présent ou le remettre à jour (au cas où il est relancé à la main pour le même jour)
  const queryUpd = { 'date': dateDebut };
  const update = { $set: dailyCras };
  const options = { upsert: true };
  db.collection('stats_daily_cras').updateOne(queryUpd, update, options);
  logger.info('Total de CRAs par jour inséré en base : ' + totalCras);

  return totalCras;

};

module.exports = { insertDailyCrasStats };
