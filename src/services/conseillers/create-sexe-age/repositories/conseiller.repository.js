const countConseillersDoubles = db => async conseillerId => db.collection('conseillers').countDocuments({
  _id: conseillerId
});

const setConseillerSexeAndDateDeNaissance = db => async (conseillerId, sexe, dateDeNaissance) => db.collection('conseillers').update({
  _id: conseillerId
}, {
  $set: { sexe, dateDeNaissance }
});

module.exports = {
  countConseillersDoubles,
  setConseillerSexeAndDateDeNaissance
};
