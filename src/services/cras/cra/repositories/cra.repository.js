const { ObjectId } = require('mongodb');

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
  const update = { $push: { [String(year)]: { 'mois': month, 'totalCras': total } } };
  await db.collection('stats_conseillers_cras').updateOne({ '_id': id }, update, options);
};

const updateStatistiquesCra = db => async (cra, oldDateAccompagnement, conseillerId) => {
  const newYear = cra.cra.dateAccompagnement.getUTCFullYear();
  const newMonth = cra.cra.dateAccompagnement.getMonth();
  const oldYear = oldDateAccompagnement.getUTCFullYear();
  const oldMonth = oldDateAccompagnement.getMonth();
  const testYear = newYear === oldYear;
  const testMonth = newMonth === oldMonth;
  const stats = await getStatsConseillerCras(db)(new ObjectId(conseillerId));

  if (stats && (testYear && !testMonth || !testYear)) {
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

const deleteCra = db => async craId => {
  await db.collection('cras').deleteOne({
    _id: new ObjectId(craId)
  });
  //TODO Manipulation statistiques
};

module.exports = {
  getCraById,
  updateCra,
  updateStatistiquesCra,
  deleteCra,
};
