const getStructureAndConseillerByDepartement = db => async departement => db.collection('structures').aggregate([
  {
    $match: {
      codeDepartement: { $in: departement }
    }
  },
  {
    $lookup: {
      localField: '_id',
      from: 'conseillers',
      foreignField: 'structureId',
      as: 'conseiller',
      pipeline: [
        {
          $match: {
            statut: 'RECRUTE'
          }
        }
      ]
    }
  },
  { $unwind: '$conseiller' },
  {
    $project: {
      'nom': 1,
      'codeDepartement': 1,
      'insee': 1,
      'contact': 1,
      'prenom': 1,
      'conseiller.nom': 1,
      'conseiller.prenom': 1,
      'conseiller.emailCN': 1,
      'conseiller.codePostal': 1,
      'conseiller.codeRegion': 1
    }
  }
]).toArray();

const getStructureAndConseillerByDepartementHubAntillesGuyane = db => async departement => db.collection('structures').aggregate([
  {
    $match: {
      $or: [
        { codeDepartement: { $eq: departement[0] } },
        { $and: [
          { codeCom: { $eq: departement[1] } },
          { codeDepartement: { $eq: '00' } }
        ] },
      ],
    }
  },
  {
    $lookup: {
      localField: '_id',
      from: 'conseillers',
      foreignField: 'structureId',
      as: 'conseiller',
      pipeline: [
        {
          $match: {
            statut: 'RECRUTE'
          }
        }
      ]
    }
  },
  { $unwind: '$conseiller' },
  {
    $project: {
      'nom': 1,
      'codeDepartement': 1,
      'insee': 1,
      'contact': 1,
      'prenom': 1,
      'conseiller.nom': 1,
      'conseiller.prenom': 1,
      'conseiller.emailCN': 1,
      'conseiller.codePostal': 1,
      'conseiller.codeRegion': 1
    }
  }
]).toArray();

const exportCnfsHubRepository = db => ({
  getStructureAndConseillerByDepartementHubAntillesGuyane: getStructureAndConseillerByDepartementHubAntillesGuyane(db),
  getStructureAndConseillerByDepartement: getStructureAndConseillerByDepartement(db)
});

module.exports = {
  exportCnfsHubRepository
};
