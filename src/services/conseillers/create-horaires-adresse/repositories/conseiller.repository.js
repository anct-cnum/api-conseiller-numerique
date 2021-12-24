const setConseillerHorairesAndAdresse = db => async (conseillerId, informationsCarthographie) => {
  await db.collection('conseillers').updateOne({
    _id: conseillerId
  }, {
    $set: { informationsCarthographie }
  });
};

module.exports = {
  setConseillerHorairesAndAdresse
};
