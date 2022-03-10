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

const getPermanenceByStructureId = db => async id => db.collection('structures').findOne({
  _id: new ObjectId(id),
}, {
  projection: {
    '_id': 0,
    'nom': 1,
    'insee.etablissement.adresse': 1,
    'coordonneesInsee.coordinates': 1
  }
});

const getCnfs = db => async structureId => db.collection('conseillers').find({
  statut: ConseillerStatut.Recrute,
  structureId: new ObjectId(structureId)
}, {
  projection: {
    '_id': 0,
    'prenom': 1,
    'nom': 1
  }
}).toArray();


const permanenceRepository = db => ({
  getConseillerById: getConseillerById(db),
  getPermanenceByStructureId: getPermanenceByStructureId(db),
  getCnfs: getCnfs(db),
});

module.exports = {
  permanenceRepository,
};
