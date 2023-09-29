const { ObjectId } = require('mongodb');

const ConseillerStatut = {
  Recrute: 'RECRUTE'
};

const getConseillerById = db => async id => db.collection('conseillers').findOne({
  _id: new ObjectId(id),
  statut: ConseillerStatut.Recrute,
}, {
  projection: {
    _id: 0,
    structureId: 1
  }
});

const getPermanenceById = db => async id => db.collection('permanences').aggregate([
  {
    $match: {
      _id: new ObjectId(id)
    }
  },
  {
    $lookup:
      {
        from: 'conseillers',
        localField: 'conseillers',
        foreignField: '_id',
        as: 'conseillers'
      }
  },
  {
    $project: {
      _id: 0,
      nomEnseigne: 1,
      numeroTelephone: 1,
      email: 1,
      siteWeb: 1,
      adresse: 1,
      location: 1,
      horaires: 1,
      typeAcces: 1,
      conseillers: {
        $map: {
          input: '$conseillers',
          as: 'conseiller',
          in: {
            prenom: { $cond: [{ $ne: ['$$conseiller.nonAffichageCarto', true] }, '$$conseiller.prenom', 'Anonyme'] },
            nom: { $cond: [{ $ne: ['$$conseiller.nonAffichageCarto', true] }, '$$conseiller.nom', ''] },
            email: { $cond: [{ $ne: ['$$conseiller.nonAffichageCarto', true] }, '$$conseiller.emailPro', ''] },
            phone: { $cond: [{ $ne: ['$$conseiller.nonAffichageCarto', true] }, '$$conseiller.telephonePro', ''] },
          }
        }
      }
    }
  },
  {
    $limit: 1
  }
]).toArray();

const checkMultipleStructureInLocation = db => async coordinates => db.collection('permanences').countDocuments(
  { 'location.coordinates': coordinates }
);

const getPermanenceBylocation = db => async coordinates => db.collection('permanences').aggregate([
  {
    $match: {
      'location.coordinates': coordinates
    }
  },
  {
    $lookup:
      {
        from: 'conseillers',
        localField: 'conseillers',
        foreignField: '_id',
        as: 'conseillers'
      }
  },
  {
    $project: {
      _id: 0,
      horaires: 1,
      conseillers: {
        $map: {
          input: '$conseillers',
          as: 'conseiller',
          in: {
            prenom: { $cond: [{ $ne: ['$$conseiller.nonAffichageCarto', true] }, '$$conseiller.prenom', 'Anonyme'] },
            nom: { $cond: [{ $ne: ['$$conseiller.nonAffichageCarto', true] }, '$$conseiller.nom', ''] },
            email: { $cond: [{ $ne: ['$$conseiller.nonAffichageCarto', true] }, '$$conseiller.emailPro', ''] },
            phone: { $cond: [{ $ne: ['$$conseiller.nonAffichageCarto', true] }, '$$conseiller.telephonePro', ''] },
          }
        }
      }
    }
  }
]).toArray();

const getStructureById = db => async id => db.collection('structures').findOne({
  _id: new ObjectId(id),
}, {
  projection: {
    '_id': 0,
    'nom': 1,
    'insee.adresse': 1,
    'coordonneesInsee.coordinates': 1,
    'estLabelliseAidantsConnect': 1,
    'estLabelliseFranceServices': 1,
  }
});

const getCnfs = db => async structureId => db.collection('conseillers').find({
  statut: ConseillerStatut.Recrute,
  estCoordinateur: { $ne: true },
  hasPermanence: { $ne: true },
  structureId: new ObjectId(structureId)
}, {
  projection: {
    '_id': 0,
    'prenom': 1,
    'nom': 1,
    'telephonePro': 1,
    'emailPro': 1,
    'nonAffichageCarto': 1
  }
}).toArray();

const permanenceRepository = db => ({
  getConseillerById: getConseillerById(db),
  getPermanenceById: getPermanenceById(db),
  getStructureById: getStructureById(db),
  checkMultipleStructureInLocation: checkMultipleStructureInLocation(db),
  getPermanenceBylocation: getPermanenceBylocation(db),
  getCnfs: getCnfs(db),
});

module.exports = {
  permanenceRepository,
};
