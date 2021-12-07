const countConseillersDoubles = db => async conseillerId => db.collection('conseillers').countDocuments({
  _id: conseillerId
});

const getConseillerAndDoublesIds = db => async conseillerId => {
  const conseiller = await db.collection('conseillers').findOne({ _id: conseillerId });
  return await db.collection('conseillers').find({ email: conseiller.email }).map(conseiller => conseiller._id).toArray();
};

const setSexeAndDateDeNaissanceOnConseillers = db => async (conseillerIds, sexe, dateDeNaissance) =>
  await db.collection('conseillers').updateMany({
    _id: { $in: conseillerIds }
  }, {
    $set: { sexe, dateDeNaissance }
  });

const setSexeAndDateDeNaissanceOnMisesEnRelations = db => async (conseillerIds, sexe, dateDeNaissance) =>
  await db.collection('misesEnRelation').updateMany({
    'conseiller.$id': { $in: conseillerIds }
  }, {
    $set: { 'conseillerObj.sexe': sexe, 'conseillerObj.dateDeNaissance': dateDeNaissance }
  });

const setConseillerSexeAndDateDeNaissance = db => async (conseillerId, sexe, dateDeNaissance) => {
  const conseillerIds = await getConseillerAndDoublesIds(db)(conseillerId);

  await setSexeAndDateDeNaissanceOnConseillers(db)(conseillerIds, sexe, dateDeNaissance);
  await setSexeAndDateDeNaissanceOnMisesEnRelations(db)(conseillerIds, sexe, dateDeNaissance);
};

module.exports = {
  countConseillersDoubles,
  setConseillerSexeAndDateDeNaissance
};
