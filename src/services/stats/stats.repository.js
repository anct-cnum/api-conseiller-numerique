const getDepartements = db => async (date, ordre, page, limit) =>
  await db.collection('stats_Territoires').find({ 'date': date })
  .sort(ordre)
  .skip(page)
  .limit(limit).toArray();

const getRegions = db => async (date, ordre, page, limit) =>
  await db.collection('stats_Territoires').aggregate(
    { $match: { date: date } },
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

const getTotalDepartements = db => async date => await db.collection('stats_Territoires').countDocuments({ 'date': date });

const getTotalRegions = db => async date => {
  const statsTotal = await db.collection('stats_Territoires').aggregate(
    { $match: { date: date } },
    { $group: { _id: { codeRegion: '$codeRegion' } } },
    { $project: { _id: 0 } }
  ).toArray();

  return statsTotal.length;
};

const getCodesPostauxStatistiquesCras = db => async conseillerId => await db.collection('cras').distinct('cra.codePostal',
  { 'conseiller.$id': conseillerId }
).toArray();

const statsRepository = db => ({
  getDepartements: getDepartements(db),
  getRegions: getRegions(db),
  getTotalDepartements: getTotalDepartements(db),
  getTotalRegions: getTotalRegions(db),
  getCodesPostauxStatistiquesCras: getCodesPostauxStatistiquesCras(db),
});

module.exports = {
  statsRepository
};
