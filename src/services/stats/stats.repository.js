const getDepartement = db => async (date, codeDepartement, codeRegion) => {
  if (codeDepartement) {
    return await db.collection('stats_Territoires').find({ 'date': date, 'codeDepartement': codeDepartement }).toArray();
  } else if (codeRegion) {
    return await db.collection('stats_Territoires').find({ 'date': date, 'codeRegion': codeRegion }).toArray();
  }
};

const getRegion = db => async (date, nomRegion, codeRegion) => {
  let match = { $match: { date, nomRegion } };
  if (nomRegion === undefined) {
    match = { $match: { date, codeRegion } };
  }
  return await db.collection('stats_Territoires').aggregate(
    match,
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
};

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

const getTotalRegions = db => async (date, nomRegion) => {
  const statsTotal = await db.collection('stats_Territoires').aggregate(
    { $match: { date: date, nomRegion } },
    { $group: { _id: { codeRegion: '$codeRegion' } } },
    { $project: { _id: 0 } }
  ).toArray();

  return statsTotal.length;
};

const getCodesPostauxStatistiquesCras = db => async conseillerId => await db.collection('cras').aggregate([
  { $match: { 'conseiller.$id': conseillerId } },
  { $group: { _id: { ville: '$cra.nomCommune', codePostal: '$cra.codePostal' } } },
]).toArray();

const getCodesPostauxStatistiquesCrasStructure = db => async structureId => await db.collection('cras').distinct('cra.codePostal',
  {
    'structure.$id': structureId
  });

const getConseillersIdsByStructure = db => async idStructure => {
  const promise = new Promise(async resolve => {
    const miseEnRelation = db.collection('misesEnRelation').find({
      'structure.$id': idStructure,
      'statut': { $in: ['finalisee', 'finalisee_rupture'] }
    }).toArray();
    resolve(miseEnRelation);
  });
  return promise;
};

const getStructuresIdsByPrefecture = db => async (code, page, limit) => {
  return await db.collection('structures').find(
    code,
  ).skip(page).limit(limit).toArray();
};

const countStructures = db => async code => {
  return await db.collection('structures').countDocuments(code);
};

const statsRepository = db => ({
  getDepartement: getDepartement(db),
  getRegion: getRegion(db),
  getDepartements: getDepartements(db),
  getRegions: getRegions(db),
  getTotalDepartements: getTotalDepartements(db),
  getTotalRegions: getTotalRegions(db),
  getCodesPostauxStatistiquesCras: getCodesPostauxStatistiquesCras(db),
  getCodesPostauxStatistiquesCrasStructure: getCodesPostauxStatistiquesCrasStructure(db),
  getConseillersIdsByStructure: getConseillersIdsByStructure(db),
  getStructuresIdsByPrefecture: getStructuresIdsByPrefecture(db),
  countStructures: countStructures(db),
});

module.exports = {
  statsRepository
};
