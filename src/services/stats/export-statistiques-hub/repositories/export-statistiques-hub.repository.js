const { ObjectId } = require('mongodb');

const getStatsCnfsHub = db => async departement => db.collection('conseillers').find({
  codeDepartement: { $in: departement },
  statut: 'RECRUTE'
}).project({
  _id: 1,
  prenom: 1,
  nom: 1,
  emailCN: 1,
  structureId: 1,
  codePostal: 1,
  codeRegion: 1
}).toArray();

const getStatsCnfsHubAntillesGuyane = db => async departement => db.collection('conseillers').find({
  $or: [
    { codeDepartement: { $eq: departement[0] } },
    { codeCom: { $eq: departement[1] } }
  ],
  statut: 'RECRUTE'
}).project({
  _id: 1,
  prenom: 1,
  nom: 1,
  emailCN: 1,
  structureId: 1,
  codePostal: 1,
  codeRegion: 1
}).toArray();

const getStructureNameFromId = db => async id => db.collection('structures')
.findOne({
  _id: new ObjectId(id)
}, {
  projection: {
    _id: 0,
    nom: 1,
    codeDepartement: 1,
    insee: 1,
    contact: 1,
    idPG: 1
  }
});

const exportStatistiquesHubRepository = db => ({
  getStatsCnfsHub: getStatsCnfsHub(db),
  getStructureNameFromId: getStructureNameFromId(db),
  getStatsCnfsHubAntillesGuyane: getStatsCnfsHubAntillesGuyane(db)
});

module.exports = {
  exportStatistiquesHubRepository,
};
