const { ObjectID } = require('mongodb');
const statsCras = require('../../cras');

const getStatsCra = async (db, statsQuery, isAdminCoop) =>
  await statsCras.getStatsGlobales(db, statsQuery, statsCras, isAdminCoop);

const getStatsNationales = db => async (dateDebut, dateFin, isAdminCoop) =>
  await getStatsCra(db, {
    'cra.dateAccompagnement': { $gte: dateDebut, $lt: dateFin }
  }, isAdminCoop);

const getStatsDepartementalRegional = db => async (dateDebut, dateFin, ids, isAdminCoop) =>
  await getStatsCra(db, {
    'cra.dateAccompagnement': { $gte: dateDebut, $lt: dateFin },
    'conseiller.$id': { $in: ids }
  }, isAdminCoop);

const getStatsConseiller = db => async (dateDebut, dateFin, conseillerId, isAdminCoop) =>
  await getStatsCra(db, {
    'conseiller.$id': new ObjectID(conseillerId),
    'cra.dateAccompagnement': { $gte: dateDebut, $lt: dateFin }
  }, isAdminCoop);

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
