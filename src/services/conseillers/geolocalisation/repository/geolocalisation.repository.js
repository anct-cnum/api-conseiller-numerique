const { ObjectID } = require('mongodb');

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

const getLieuxDePermanence = () => async () => {
  return [
    {
      _id: new ObjectID('620d22f5ad52e276a3dd68ae'),
      nomEnseigne: 'CCAS des HERBIERS',
      adresse: {
        numeroRue: '6',
        rue: 'RUE DU TOURNIQUET',
        codePostal: '85500',
        ville: 'LES HERBIERS'
      },
      location: {
        type: 'Point',
        coordinates: [
          -1.0134,
          46.8691
        ],
      },
      horaires: [
        {
          matin: [
            '8:00',
            '12:30'
          ],
          apresMidi: [
            '13:30',
            '18:00'
          ]
        },
        {
          matin: [
            '8:00',
            '12:30'
          ],
          apresMidi: [
            '13:30',
            '18:00'
          ]
        },
        {
          matin: [
            '8:00',
            '12:30'
          ],
          apresMidi: [
            '13:30',
            '18:00'
          ]
        },
        {
          matin: [
            '8:00',
            '12:30'
          ],
          apresMidi: [
            '13:30',
            '18:00'
          ]
        },
        {
          matin: [
            '8:00',
            '12:30'
          ],
          apresMidi: [
            '13:30',
            '18:00'
          ]
        },
        {
          matin: [
            'Fermé',
            'Fermé'
          ],
          apresMidi: [
            'Fermé',
            'Fermé'
          ]
        },
        {
          matin: [
            'Fermé',
            'Fermé'
          ],
          apresMidi: [
            'Fermé',
            'Fermé'
          ]
        }
      ]
    }
  ];
};

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
