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
    $addFields: {
      'listConseillersIds': {
        $concatArrays: ['$conseillers', '$conseillersItinerants', '$lieuPrincipalPour'] } }
  },
  {
    $lookup: {
      from: 'conseillers',
      localField: 'listConseillersIds',
      foreignField: '_id',
      as: 'aidants'
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
            'nom': 1,
            'siret': 1,
            'estLabelliseFranceServices': 1,
            'estLabelliseAidantsConnect': 1,
            'urlPriseRdv': 1
          }
        }
      ]
    }
  },
  { $unwind: '$structure' },
  { $project: {
    'nomEnseigne': 1,
    'horaires': 1,
    'typeAcces': 1,
    'adresse': 1,
    'location': 1,
    'numeroTelephone': 1,
    'email': 1,
    'siteWeb': 1,
    'updatedAt': 1,
    'structure': 1,
    'siret': 1,
    'aidants._id': 1,
    'aidants.nom': 1,
    'aidants.prenom': 1,
    'aidants.emailPro': 1,
    'aidants.telephonePro': 1,
    'aidants.nonAffichageCarto': 1,
    'aidants.statut': 1
  } },
  { $addFields: {
    codePostalTri: { $trim: { input: '$adresse.codePostal' } },
    villeTri: { $trim: { input: '$adresse.ville' } },
    nomTri: { $trim: { input: '$nomEnseigne' } }
  } },
  { $sort: { 'codePostalTri': 1, 'villeTri': 1, 'nomTri': 1, '_id': 1 } }
], {
  collation: { locale: 'fr' },
  allowDiskUse: true
}).toArray();

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

const createPermanence = db => async (permanence, conseillerId, hasPermanence, telephonePro, emailPro) => {
  const { ops } = await db.collection('permanences').insertOne(
    permanence
  );

  await db.collection('conseillers').updateOne({
    _id: new ObjectId(conseillerId)
  }, {
    $set: {
      hasPermanence,
      telephonePro,
      emailPro,
    }
  });

  return ops[0]._id;
};

const setPermanence = db => async (permanenceId, permanence, conseillerId, hasPermanence,
  telephonePro, emailPro) => {
  await db.collection('permanences').replaceOne({ _id: new ObjectId(permanenceId) }, permanence, { upsert: true });

  await db.collection('conseillers').updateOne({
    _id: new ObjectId(conseillerId)
  }, {
    $set: {
      hasPermanence,
      telephonePro,
      emailPro: emailPro.trim(),
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
    $unset: { permanence: '' }
  });
};

const deleteCraConseillerPermanence = db => async (permanenceId, idConseiller) => {
  await db.collection('cras').updateMany({
    'permanence.$id': new ObjectId(permanenceId),
    'conseiller.$id': new ObjectId(idConseiller)
  }, {
    $unset: { permanence: '' }
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

const checkPermanenceExistsBySiret = db => async siret => {
  const result = await db.collection('permanences').countDocuments({ 'siret': siret });
  return result > 0;
};

const checkPermanenceExistsByLocation = db => async (location, adresse, structureId) => {
  const result = await db.collection('permanences').countDocuments({
    '$or': [
      {
        'location': location
      },
      {
        'adresse.numeroRue': adresse.numeroRue,
        'adresse.rue': adresse.rue,
        'adresse.codeCommune': adresse.codeCommune,
        'adresse.ville': adresse.ville
      }
    ],
    'structure.$id': new ObjectId(structureId) });
  return result > 0;
};

const getAdressesCheckedByLocation = db => async (adresses, structureId) => {
  let foundExistedPermanence = false;
  const adressesChecked = [];
  const promises = [];
  adresses.forEach(adresse => {
    promises.push(new Promise(async resolve => {
      const existsPermanence = await db.collection('permanences').countDocuments({
        '$or': [
          {
            'location': adresse.geometry
          },
          {
            'adresse.numeroRue': adresse.properties.housenumber,
            'adresse.rue': adresse.properties.street,
            'adresse.codeCommune': adresse.properties.citycode,
            'adresse.ville': adresse.properties.city
          }
        ],
        'structure.$id': new ObjectId(structureId) }
      );

      if (existsPermanence === 0) {
        adressesChecked.push(adresse);
      } else {
        foundExistedPermanence = true;
      }
      resolve();
    }));
  });
  await Promise.all(promises);
  return { adresseApi: adressesChecked, foundExistedPermanence };
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
  deleteCraConseillerPermanence,
  setReporterInsertion,
  updateConseillerStatut,
  checkPermanenceExistsBySiret,
  checkPermanenceExistsByLocation,
  getAdressesCheckedByLocation,
};
