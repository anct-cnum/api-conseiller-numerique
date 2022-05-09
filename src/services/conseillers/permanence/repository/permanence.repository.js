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
          input: {
            $filter: {
              input: '$conseillers',
              as: 'conseillerFiltered',
              cond: { '$$conseillerFiltered.nonAffichageCarto': { $ne: true } }
            }
          },
          as: 'conseiller',
          in: {
            prenom: '$$conseiller.prenom',
            nom: '$$conseiller.nom',
            email: '$$conseiller.emailPro',
            phone: '$$conseiller.telephonePro',
          }
        }
      }
    }
  },
  {
    $limit: 1
  }
]).toArray();

const getStructureById = db => async id => db.collection('structures').findOne({
  _id: new ObjectId(id),
}, {
  projection: {
    '_id': 0,
    'nom': 1,
    'insee.etablissement.adresse': 1,
    'coordonneesInsee.coordinates': 1,
    'estLabelliseAidantsConnect': 1,
    'estLabelliseFranceServices': 1,
  }
});

const getCnfs = db => async structureId => db.collection('conseillers').find({
  statut: ConseillerStatut.Recrute,
  estCoordinateur: { $ne: true },
  hasPermanence: { $ne: true },
  structureId: new ObjectId(structureId),
  nonAffichageCarto: { $ne: true }
}, {
  projection: {
    '_id': 0,
    'prenom': 1,
    'nom': 1,
    'telephonePro': 1,
    'emailPro': 1
  }
}).toArray();

const permanenceRepository = db => ({
  getConseillerById: getConseillerById(db),
  getPermanenceById: getPermanenceById(db),
  getStructureById: getStructureById(db),
  getCnfs: getCnfs(db),
});

module.exports = {
  permanenceRepository,
};
