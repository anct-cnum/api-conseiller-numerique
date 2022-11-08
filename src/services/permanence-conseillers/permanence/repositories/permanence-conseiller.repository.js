const { ObjectId } = require('mongodb');

const getPermanences = db => async () => await db.collection('permanences').aggregate([
  {
    $addFields: {
      'entity': {
        $arrayElemAt: [{ $objectToArray: '$structure' }, 1]
      }
    }
  },
  {
    $lookup: {
      from: 'structures',
      let: { idStructure: '$entity.v' },
      as: 'structure',
      pipeline: [
        {
          $match: { $expr: { $eq: ['$$idStructure', '$_id'] } },
        },
        {
          $project: {
            '_id': 0,
            'siret': 1,
            'estLabelliseFranceServices': 1,
            'estLabelliseAidantsConnect': 1,
            'urlPriseRdv': 1
          }
        }
      ]
    }
  },
  { $unwind: '$structure' }
]).toArray();

const getPermanenceById = db => async permanenceId => {
  return await db.collection('permanences').findOne({ '_id': new ObjectId(permanenceId) });
};

const getPermanencesByConseiller = db => async conseillerId => {
  return await db.collection('permanences').find({ 'conseillers': { '$in': [new ObjectId(conseillerId)] } })
  .sort({ 'adresse.codePostal': 1, 'adresse.ville': 1 }).toArray();
};

const getPermanencesByStructure = db => async structureId => {
  return await db.collection('permanences').find({ 'structure.$id': new ObjectId(structureId) }).toArray();
};

const createPermanence = db => async (permanence, conseillerId, hasPermanence, telephonePro, emailPro, estCoordinateur) => {
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
};

const setPermanence = db => async (permanenceId, permanence, conseillerId, hasPermanence,
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

const deleteCraPermanence = db => async permanenceId => {
  await db.collection('cras').updateMany({
    'permanence.$id': new ObjectId(permanenceId)
  }, {
    $unset: { permanence: null }
  });
};

const setReporterInsertion = db => async userId => {
  await db.collection('users').updateOne({
    _id: userId
  }, {
    $inc: { reportPermanence: +1 }
  });
};

const updateConseillerStatut = db => async conseillerId => {
  await db.collection('conseillers').updateOne({
    _id: new ObjectId(conseillerId)
  }, {
    $set: { hasPermanence: true }
  });
};

module.exports = {
  getPermanences,
  getPermanenceById,
  getPermanencesByConseiller,
  getPermanencesByStructure,
  setPermanence,
  createPermanence,
  updatePermanences,
  deletePermanence,
  deleteConseillerPermanence,
  deleteCraPermanence,
  setReporterInsertion,
  updateConseillerStatut,
};
