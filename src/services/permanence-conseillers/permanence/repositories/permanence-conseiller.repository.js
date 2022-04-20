const { ObjectId } = require('mongodb');

const getPermanenceByConseiller = db => async conseillerId => {
  return await db.collection('permanences').findOne({ 'conseiller.$id': new ObjectId(conseillerId) });
};

const getPermanencesByStructure = db => async structureId => {
  return await db.collection('permanences').find({ 'structure.$id': new ObjectId(structureId) }).toArray();
};

const createPermanence = db => async (permanence, conseillerId, userId, showPermanenceForm, hasPermanence, telephonePro, emailPro, estCoordinateur) => {
  await db.collection('permanences').insertOne(
    permanence
  );

  await db.collection('conseillers').updateOne({
    _id: new ObjectId(conseillerId)
  }, {
    $set: {
      hasPermanence,
      telephonePro,
      emailPro,
      estCoordinateur,
    }
  });

  await db.collection('users').updateOne({
    _id: new ObjectId(userId)
  }, {
    $set: {
      showPermanenceForm
    }
  });
};

const setPermanence = db => async (permanenceId, permanence, conseillerId, userId, showPermanenceForm, hasPermanence,
  telephonePro, emailPro, estCoordinateur) => {
  await db.collection('permanences').updateOne({
    _id: new ObjectId(permanenceId)
  }, {
    $set: permanence
  });

  await db.collection('conseillers').updateOne({
    _id: new ObjectId(conseillerId)
  }, {
    $set: {
      hasPermanence,
      telephonePro,
      emailPro,
      estCoordinateur,
    }
  });

  await db.collection('users').updateOne({
    _id: new ObjectId(userId)
  }, {
    $set: {
      showPermanenceForm
    }
  });
};

const deletePermanence = db => async permanenceId => {
  await db.collection('permanences').deleteOne({
    _id: new ObjectId(permanenceId)
  });
};

const deleteConseillerPermanence = db => async(permanenceId, conseillerId) => {
  await db.collection('permanences').updateOne({
    _id: new ObjectId(permanenceId)
  }, {
    $pull: {
      conseillers: new ObjectId(conseillerId),
      conseillersItinerants: new ObjectId(conseillerId),
      lieuPrincipalPour: new ObjectId(conseillerId),
    }
  });
};

module.exports = {
  getPermanenceByConseiller,
  getPermanencesByStructure,
  setPermanence,
  createPermanence,
  deletePermanence,
  deleteConseillerPermanence
};
