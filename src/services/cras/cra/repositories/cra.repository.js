const { ObjectId } = require('mongodb');
const { escapeRegex } = require('../../../../utils/escapeRegex');

const getCraById = db => async craId => {
  return await db.collection('cras').findOne({ '_id': new ObjectId(craId) });
};

const updateCra = db => async cra => {
  await db.collection('cras').updateOne({
    _id: cra._id
  }, {
    $set: cra
  });
};

const getStatsConseillerCras = db => async idConseiller => {
  return await db.collection('stats_conseillers_cras').findOne({ 'conseiller.$id': idConseiller });
};

//On supprime la ligne impactée
const deleteLigneCra = db => async (year, month, id, options) => {
  const remove = { $pull: { [String(year)]: { 'mois': month } } };
  await db.collection('stats_conseillers_cras').updateOne({ '_id': id }, remove, options);
};

//On met à jour la nouvelle stat correspondante au mois et à l'annee
const updateLigneCra = db => async (year, month, total, id, options) => {
  const listMois = Array.from({ length: 12 }, (e, i) => {
    return new Date(null, i + 1, null).toLocaleDateString('fr', { month: 'long' });
  });
  const update = { $push: { [String(year)]: { 'mois': month, 'totalCras': total, 'indication': listMois[month] } } };
  await db.collection('stats_conseillers_cras').updateOne({ '_id': id }, update, options);
};

const updateStatistiquesCra = db => async (cra, oldDateAccompagnement, conseillerId, createdAt) => {
  const dateCreateCra = createdAt;
  dateCreateCra.setUTCHours(0, 0, 0, 0);
  const dateNow = new Date();
  dateNow.setUTCHours(0, 0, 0, 0);
  const newYear = cra.cra.dateAccompagnement.getUTCFullYear();
  const newMonth = cra.cra.dateAccompagnement.getMonth();
  const oldYear = oldDateAccompagnement.getUTCFullYear();
  const oldMonth = oldDateAccompagnement.getMonth();
  const testCraCreate = dateCreateCra.toString() !== dateNow.toString();
  const testYear = newYear === oldYear;
  const testMonth = newMonth === oldMonth;
  const stats = await getStatsConseillerCras(db)(new ObjectId(conseillerId));
  if (stats && (testYear && !testMonth || !testYear) && testCraCreate) {
    const options = { upsert: true };

    let oldTotal = stats[String(oldYear)]?.find(stat => stat.mois === oldMonth)?.totalCras;
    oldTotal = oldTotal ? oldTotal - 1 : 0;
    let newTotal = stats[String(newYear)]?.find(stat => stat.mois === newMonth)?.totalCras;
    newTotal = newTotal ? newTotal + 1 : 1;

    await deleteLigneCra(db)(oldYear, oldMonth, stats._id, options);
    await deleteLigneCra(db)(newYear, newMonth, stats._id, options);
    await updateLigneCra(db)(oldYear, oldMonth, oldTotal, stats._id, options);
    await updateLigneCra(db)(newYear, newMonth, newTotal, stats._id, options);
  }
};

const countCraByPermanenceId = db => async permanenceId => {
  return await db.collection('cras').countDocuments({ 'permanence.$id': new ObjectId(permanenceId) });
};

const insertDeleteCra = db => async (craId, userId, craObj) => {
  await db.collection('cras_deleted').insertOne({
    '_id': new ObjectId(craId),
    'deletedAt': new Date(),
    'conseillerId': userId,
    craObj
  });
};

const deleteCra = db => async (craId, userId, craObj) => {
  await db.collection('cras').deleteOne({
    _id: new ObjectId(craId)
  });
  await insertDeleteCra(db)(craId, userId, craObj);
};

const deleteStatistiquesCra = db => async cra => {
  const options = { upsert: true };
  const year = cra.cra.dateAccompagnement.getUTCFullYear();
  const month = cra.cra.dateAccompagnement.getMonth();
  const stats = await getStatsConseillerCras(db)(new ObjectId(cra.conseiller.oid));
  if (stats) {
    let total = stats[String(year)]?.find(stat => stat.mois === month)?.totalCras;
    await deleteLigneCra(db)(year, month, stats._id, options);
    if (total > 1) {
      await updateLigneCra(db)(year, month, total - 1, stats._id, options);
    }
  }
};


const searchSousThemes = db => async sousTheme => {
  const regex = new RegExp(escapeRegex(sousTheme));
  const sousThemes = [];

  const result = await db.collection('cras').aggregate([
    { $match: { 'cra.sousThemes': { '$elemMatch': { 'annotation': { '$in': [regex] } } } } },
    { $group: { '_id': '$cra.sousThemes' } },
    { $project: {
      '_id': 0,
      'sousThemes': { $map: {
        input: '$_id',
        as: 'sousThemes',
        in: '$$sousThemes.annotation'
      } }
    } },
    { $limit: 30 }
  ]).toArray();

  result.forEach(element => {
    element.sousThemes.forEach(sousTheme => {
      if (sousTheme !== null && !sousThemes.includes(sousTheme[0])) {
        sousThemes.push(sousTheme[0]);
      }
    });
  });
  return sousThemes;
};

module.exports = {
  getCraById,
  updateCra,
  updateStatistiquesCra,
  countCraByPermanenceId,
  deleteStatistiquesCra,
  deleteCra,
  insertDeleteCra,
  searchSousThemes,
};
