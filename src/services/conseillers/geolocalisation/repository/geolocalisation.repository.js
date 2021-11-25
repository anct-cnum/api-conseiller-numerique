const ConseillerStatut = {
  Recrute: 'RECRUTE'
};

const getConseillerWithGeolocation = db => () =>
  db.collection('conseillers').aggregate([
    { $match: { statut: ConseillerStatut.Recrute } },
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
        '_id': 0,
        'prenom': 1,
        'nom': 1,
        'structure.location': 1
      }
    }
  ]).toArray();

const geolocationRepository = db => ({
  getConseillerWithGeolocation: getConseillerWithGeolocation(db)
});

module.exports = {
  geolocationRepository
};
