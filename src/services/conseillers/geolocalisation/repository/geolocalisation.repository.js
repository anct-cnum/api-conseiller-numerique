const ConseillerStatut = {
  Recrute: 'RECRUTE'
};

const getStructureWithGeolocation = db => async id => db.collection('structures').findOne({
  _id: id,
}, {
  projection: {
    _id: 0,
    coordonneesInsee: 1,
    location: 1
  }
});

const getConseillersWithGeolocation = db => async () =>
  db.collection('conseillers').aggregate([
    {
      $match: {
        statut: ConseillerStatut.Recrute,
        estCoordinateur: { $ne: true },
        hasPermanence: { $ne: true }
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
      $project: {
        '_id': 1,
        'structure.coordonneesInsee': 1,
        'structure.location': 1,
        'structure.nom': 1,
        'structure.estLabelliseFranceServices': 1,
        'structure.insee.etablissement.adresse': 1
      }
    }
  ]).toArray();

const getLieuxDePermanence = db => async () => db.collection('permanences').find({
  location: { $ne: null },
}, {
  projection: {
    '_id': 1,
    'nomEnseigne': 1,
    'adresse': 1,
    'location': 1,
    'horaires': 1
  }
}).toArray();

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
  getStructureWithGeolocation: getStructureWithGeolocation(db),
  getConseillersWithGeolocation: getConseillersWithGeolocation(db),
  getConseillersByCodeDepartement: getConseillersByCodeDepartement(db),
  getLieuxDePermanence: getLieuxDePermanence(db)
});

module.exports = {
  geolocationRepository
};
