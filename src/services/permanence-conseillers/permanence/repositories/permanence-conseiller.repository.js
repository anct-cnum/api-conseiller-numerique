const { ObjectId } = require('mongodb');

const getPermanenceByConseiller = db => async conseillerId => {
  return await db.collection('permanences').findOne({ 'conseiller.$id': new ObjectId(conseillerId) });
};

const createPermanence = db => async (permanence, conseillerId) => {
  await db.collection('permanences').insertOne(
    permanence
  );
  await db.collection('conseillers').updateOne({
    _id: new ObjectId(conseillerId)
  }, {
    $set: { hasPermanence: true }
  });
};

const setPermanence = db => async (permanenceId, permanence) => {
  await db.collection('permanences').updateOne({
    _id: new ObjectId(permanenceId)
  }, {
    $set: permanence
  });
};
module.exports = {
  getPermanenceByConseiller,
  setPermanence,
  createPermanence
};
