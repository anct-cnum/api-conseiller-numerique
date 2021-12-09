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
        '_id': 0,
        'prenom': 1,
        'nom': 1,
        'emailCN.address': 1,
        'structure.coordonneesInsee': 1,
        'structure.nom': 1,
        'structure.estLabelliseFranceServices': 1,
        'structure.contact.telephone': 1,
        'structure.insee.etablissement.adresse': 1
      }
    }
  ]).toArray();

const geolocationRepository = db => ({
  getConseillerWithGeolocation: getConseillerWithGeolocation(db)
});

module.exports = {
  geolocationRepository
};
