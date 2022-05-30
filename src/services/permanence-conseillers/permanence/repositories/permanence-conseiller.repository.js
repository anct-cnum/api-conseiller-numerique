const { ObjectId } = require('mongodb');

const getPermanenceById = db => async permanenceId => {
  return await db.collection('permanences').findOne({ '_id': new ObjectId(permanenceId) });
};

const getPermanencesByConseiller = db => async conseillerId => {
  return await db.collection('permanences').find({ 'conseillers': { '$in': [new ObjectId(conseillerId)] } }).toArray();
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

const updatePermanences = db => async permanences => {
  let promises = [];
  permanences.forEach(permanence => {
    promises.push(new Promise(async resolve => {
      if (permanence._id) {
        db.collection('permanences').updateOne({
          _id: permanence._id
        }, {
          $set: permanence
        });
      } else {
        db.collection('permanences').insertOne(
          permanence
        );
      }
      resolve();
    }));
  });
  await Promise.all(promises);
};

const deletePermanence = db => async permanenceId => {
  await db.collection('permanences').deleteOne({
    _id: new ObjectId(permanenceId)
  });
};

const deleteConseillerPermanence = db => async (permanenceId, conseillerId) => {
  conseillerId = typeof (conseillerId) === 'string' ? new ObjectId(conseillerId) : conseillerId;
  await db.collection('permanences').updateOne({
    _id: new ObjectId(permanenceId)
  }, {
    $pull: {
      conseillers: conseillerId,
      conseillersItinerants: conseillerId,
      lieuPrincipalPour: conseillerId,
    }
  });
};

const setReporterInsertion = db => async userId => {
  await db.collection('users').updateOne({
    _id: userId
  }, {
    $inc: { reportPermanence: +1 }
  });
};
const updateConseillerStatut = db => async (userId, conseillerId) => {
  await db.collection('users').updateOne({
    _id: userId
  }, {
    $set: { showPermanenceForm: false }
  });
  await db.collection('conseillers').updateOne({
    _id: new ObjectId(conseillerId)
  }, {
    $set: { hasPermanence: true }
  });
};

module.exports = {
  getPermanenceById,
  getPermanencesByConseiller,
  getPermanencesByStructure,
  setPermanence,
  createPermanence,
  updatePermanences,
  deletePermanence,
  deleteConseillerPermanence,
  setReporterInsertion,
  updateConseillerStatut,
};
