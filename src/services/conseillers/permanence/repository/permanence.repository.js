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
    'insee.etablissement.adresse': 1
  }
});

const getNombreCnfs = db => async structureId => db.collection('conseillers').find({
  statut: ConseillerStatut.Recrute,
  structureId: new ObjectId(structureId)
}).count();

const permanenceRepository = db => ({
  getConseillerById: getConseillerById(db),
  getPermanenceByStructureId: getPermanenceByStructureId(db),
  getNombreCnfs: getNombreCnfs(db),
});

module.exports = {
  permanenceRepository,
};
