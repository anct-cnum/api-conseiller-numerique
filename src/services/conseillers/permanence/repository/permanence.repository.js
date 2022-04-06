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

const getPermanenceById = () => async id => id === '620d22f5ad52e276a3dd68ae' ? {
  nomEnseigne: 'CCAS des HERBIERS',
  numeroTelephone: '0653658996',
  email: 'structure@mailgenerique.com',
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
  ],
  typeAcces: 'libre',
  conseillers: [
    {
      prenom: 'Christelle',
      nom: 'Bateau',
    }
  ],
  siteWeb: 'https://ccas-des-herbiers.com',
} : {};

const getStructureById = db => async id => db.collection('structures').findOne({
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
  estCoordinateur: { $ne: true },
  hasPermanence: { $ne: true },
  structureId: new ObjectId(structureId)
}, {
  projection: {
    '_id': 0,
    'prenom': 1,
    'nom': 1,
    'telephonePro': 1,
    'emailPro': 1
  }
}).toArray();


const permanenceRepository = db => ({
  getConseillerById: getConseillerById(db),
  getPermanenceById: getPermanenceById(db),
  getStructureById: getStructureById(db),
  getCnfs: getCnfs(db),
});

module.exports = {
  permanenceRepository,
};
