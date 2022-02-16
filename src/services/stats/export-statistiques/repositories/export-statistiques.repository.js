const { ObjectID } = require('mongodb');
const statsCras = require('../../cras');

const getStatsCra = async (db, statsQuery) =>
  await statsCras.getStatsGlobales(db, statsQuery, statsCras);

const getStatsNationales = db => async (dateDebut, dateFin) =>
  await getStatsCra(db, {
    'cra.dateAccompagnement': { $gte: dateDebut, $lt: dateFin }
  });

const getStatsDepartementalRegional = db => async (dateDebut, dateFin, ids) =>
  await getStatsCra(db, {
    'cra.dateAccompagnement': { $gte: dateDebut, $lt: dateFin },
    'conseiller.$id': { $in: ids }
  });

const getStatsConseiller = db => async (dateDebut, dateFin, conseillerId) =>
  await getStatsCra(db, {
    'conseiller.$id': new ObjectID(conseillerId),
    'cra.dateAccompagnement': { $gte: dateDebut, $lt: dateFin }
  });

const getConseillerById = db => async id =>
  await db.collection('conseillers').findOne({ _id: new ObjectID(id) });

const exportStatistiquesRepository = db => ({
  getConseillerById: getConseillerById(db),
  getStatsNationales: getStatsNationales(db),
  getStatsConseiller: getStatsConseiller(db),
  getStatsDepartementalRegional: getStatsDepartementalRegional(db)
});

module.exports = {
  exportStatistiquesRepository
};
