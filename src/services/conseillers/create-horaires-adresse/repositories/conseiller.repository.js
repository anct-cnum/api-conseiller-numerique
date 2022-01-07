const { ObjectId } = require('mongodb');

const setConseillerHorairesAndAdresse = db => async (conseillerId, informationsCartographie) => {
  await db.collection('conseillers').updateOne({
    _id: new ObjectId(conseillerId)
  }, {
    $set: { informationsCartographie }
  });
};

module.exports = {
  setConseillerHorairesAndAdresse
};
