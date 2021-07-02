const { ObjectID } = require('mongodb');

const getStatsEvolutions = async (db, conseillerId) => {

  let query = {
    'conseiller.$id': new ObjectID(conseillerId),
  };

  let evolutions = await db.collection('stats_conseillers_cras').findOne(query, { projection: { '_id': 0, 'updatedAt': 0, 'conseiller': 0 } });

  return evolutions ?? {};

};

module.exports = { getStatsEvolutions };
