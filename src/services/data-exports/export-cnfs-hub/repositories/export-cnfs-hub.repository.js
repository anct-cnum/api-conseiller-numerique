const getStructureAndConseillerByDepartement = db => async departements => db.collection('structures').aggregate([
  {
    $match: {
      codeDepartement: { $in: departements }
    }
  },
  {
    $lookup: {
      from: 'conseillers',
      let: { idStructure: '$_id' },
      as: 'conseiller',
      pipeline: [
        {
          $match: {
            $and: [
              { $expr: { $eq: ['$$idStructure', '$structureId'] } },
              { $expr: { $eq: ['$statut', 'RECRUTE'] } }
            ]
          }
        }
      ]
    }
  },
  { $unwind: '$conseiller' },
  {
    $project: {
      'nom': 1,
      'insee': 1,
      'contact': 1,
      'codeRegion': 1,
      'conseiller.nom': 1,
      'conseiller.prenom': 1,
      'conseiller.emailCN': 1,
      'conseiller.mattermost': 1,
    }
  }
]).toArray();

const getStructureAndConseillerByDepartementHubAntillesGuyane = db => async departements => db.collection('structures').aggregate([
  {
    $match: {
      $or: [
        { codeDepartement: { $in: departements } },
        { $and: [
          { codeCom: { $eq: '978' } },
          { codeDepartement: { $eq: '00' } }
        ] },
      ],
    }
  },
  {
    $lookup: {
      from: 'conseillers',
      let: { idStructure: '$_id' },
      as: 'conseiller',
      pipeline: [
        {
          $match: {
            $and: [
              { $expr: { $eq: ['$$idStructure', '$structureId'] } },
              { $expr: { $eq: ['$statut', 'RECRUTE'] } }
            ]
          }
        }
      ]
    }
  },
  { $unwind: '$conseiller' },
  {
    $project: {
      'nom': 1,
      'insee': 1,
      'contact': 1,
      'codeRegion': { $cond: { if: { $eq: ['$codeCom', '978'] }, then: '$codeCom', else: '$codeRegion' } },
      'conseiller.nom': 1,
      'conseiller.prenom': 1,
      'conseiller.emailCN': 1,
      'conseiller.mattermost': 1,
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
