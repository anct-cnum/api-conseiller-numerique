const getDepartement = db => async (date, codeDepartement) =>
  await db.collection('stats_Territoires').find({ 'date': date, 'codeDepartement': codeDepartement }).toArray();

const getRegion = db => async (date, nomRegion) =>
  await db.collection('stats_Territoires').aggregate(
    { $match: { date: date, nomRegion: nomRegion } },
    { $group: {
      _id: {
        codeRegion: '$codeRegion',
        nomRegion: '$nomRegion',
      },
      nombreConseillersCoselec: { $sum: '$nombreConseillersCoselec' },
      cnfsActives: { $sum: '$cnfsActives' },
      cnfsInactives: { $sum: '$cnfsInactives' },
      conseillerIds: { $push: '$conseillerIds' }
    } },
    { $addFields: { 'codeRegion': '$_id.codeRegion', 'nomRegion': '$_id.nomRegion' } },
    { $project: {
      _id: 0, codeRegion: 1, nomRegion: 1, nombreConseillersCoselec: 1, cnfsActives: 1, cnfsInactives: 1,
      conseillerIds: { $reduce: {
        input: '$conseillerIds',
        initialValue: [],
        in: { $concatArrays: ['$$value', '$$this'] }
      } }
    } }
  ).toArray();

const getDepartements = db => async (date, ordre, codeDepartement, page, limit) =>
  await db.collection('stats_Territoires').find({ 'date': date, codeDepartement })
  .sort(ordre)
  .skip(page)
  .limit(limit).toArray();

const getRegions = db => async (date, ordre, nomRegion, page, limit) =>
  await db.collection('stats_Territoires').aggregate(
    { $match: { date: date, nomRegion } },
    { $group: {
      _id: {
        codeRegion: '$codeRegion',
        nomRegion: '$nomRegion',
      },
      nombreConseillersCoselec: { $sum: '$nombreConseillersCoselec' },
      cnfsActives: { $sum: '$cnfsActives' },
      cnfsInactives: { $sum: '$cnfsInactives' },
      conseillerIds: { $push: '$conseillerIds' }
    } },
    { $addFields: { 'codeRegion': '$_id.codeRegion', 'nomRegion': '$_id.nomRegion' } },
    { $project: {
      _id: 0, codeRegion: 1, nomRegion: 1, nombreConseillersCoselec: 1, cnfsActives: 1, cnfsInactives: 1,
      conseillerIds: { $reduce: {
        input: '$conseillerIds',
        initialValue: [],
        in: { $concatArrays: ['$$value', '$$this'] }
      } }
    } },
    { $sort: ordre },
    { $skip: page },
    { $limit: limit },
  ).toArray();

const getTotalDepartements = db => async (date, codeDepartement) => await db.collection('stats_Territoires').countDocuments({ 'date': date, codeDepartement });

const getTotalRegions = db => async (date, nomRegion) => {
  const statsTotal = await db.collection('stats_Territoires').aggregate(
    { $match: { date: date, nomRegion } },
    { $group: { _id: { codeRegion: '$codeRegion' } } },
    { $project: { _id: 0 } }
  ).toArray();

  return statsTotal.length;
};

const getCodesPostauxStatistiquesCras = db => async conseillerId => await db.collection('cras').distinct('cra.codePostal',
  { 'conseiller.$id': conseillerId }
);

const statsRepository = db => ({
  getDepartement: getDepartement(db),
  getRegion: getRegion(db),
  getDepartements: getDepartements(db),
  getRegions: getRegions(db),
  getTotalDepartements: getTotalDepartements(db),
  getTotalRegions: getTotalRegions(db),
  getCodesPostauxStatistiquesCras: getCodesPostauxStatistiquesCras(db),
});

module.exports = {
  statsRepository
};
