const ConseillerStatut = {
  Recrute: 'RECRUTE'
};

const getConseillerWithGeolocation = db => async () =>
  db.collection('conseillers').aggregate([
    {
      $match: {
        statut: ConseillerStatut.Recrute
      }
    },
    {
      $lookup: {
        localField: 'structureId',
        from: 'structures',
        foreignField: '_id',
        as: 'structure'
      }
    },
    { $unwind: '$structure' },
    {
      $match: {
        'structure.coordonneesInsee': { $ne: null }
      }
    },
    {
      $project: {
        '_id': 1,
        'structure.coordonneesInsee': 1,
        'structure.nom': 1,
        'structure.estLabelliseFranceServices': 1,
        'structure.insee.etablissement.adresse': 1
      }
    }
  ]).toArray();

const getConseillersByCodeDepartement = db => async () => db.collection('conseillers').aggregate([
  {
    $match: {
      statut: ConseillerStatut.Recrute
    }
  },
  {
    $group:
      {
        _id: '$codeDepartement',
        count: { $sum: 1 }
      }
  }
]).toArray();

const geolocationRepository = db => ({
  getConseillerWithGeolocation: getConseillerWithGeolocation(db),
  getConseillersByCodeDepartement: getConseillersByCodeDepartement(db)
});

module.exports = {
  geolocationRepository
};
