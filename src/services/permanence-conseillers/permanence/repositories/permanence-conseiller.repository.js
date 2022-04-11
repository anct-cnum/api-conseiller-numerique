const { ObjectId } = require('mongodb');

const getPermanenceByConseiller = db => async conseillerId => {
  return await db.collection('permanences').findOne({ 'conseiller.$id': new ObjectId(conseillerId) });
};

const getPermanencesByStructure = db => async structureId => {
  return await db.collection('permanences').find({ 'structure.$id': new ObjectId(structureId) }).toArray();
};

const createPermanence = db => async (permanence, conseillerId, showPermanenceForm, hasPermanence, telephonePro, emailPro, estCoordinateur) => {
  await db.collection('permanences').insertOne(
    permanence
  );
  await db.collection('conseillers').updateOne({
    _id: new ObjectId(conseillerId)
  }, {
    $set: {
      showPermanenceForm,
      hasPermanence,
      telephonePro,
      emailPro,
      estCoordinateur,
    }
  });
};

const setPermanence = db => async (permanenceId, permanence, conseillerId, showPermanenceForm, hasPermanence, telephonePro, emailPro, estCoordinateur) => {
  await db.collection('permanences').updateOne({
    _id: new ObjectId(permanenceId)
  }, {
    $set: permanence
  });
  await db.collection('conseillers').updateOne({
    _id: new ObjectId(conseillerId)
  }, {
    $set: {
      showPermanenceForm,
      hasPermanence,
      telephonePro,
      emailPro,
      estCoordinateur,
    }
  });
};

module.exports = {
  getPermanenceByConseiller,
  getPermanencesByStructure,
  setPermanence,
  createPermanence,
};
