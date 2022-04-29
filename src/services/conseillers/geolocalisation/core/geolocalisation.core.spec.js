const { geolocatedConseillers, geolocatedStructure, geolocatedPermanence } = require('./geolocalisation.core');
const { ObjectID } = require('mongodb');

describe('conseillers géolocalisés', () => {
  it('devrait retourner les conseillers localisé sur leur structure d\'accueil', async () => {
    const expectedStructures = {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: [3.158667, 46.987344]
          },
          properties: {
            id: '4c38ebc9a06fdd532bf9d7be',
            name: 'Association pour la formation au numérique à Bessenay',
            structureId: '98b3ca349340250d5d9a144e',
            isLabeledAidantsConnect: false,
            isLabeledFranceServices: true,
            address: '6 rue de la Mairie, 69690 Bessenay'
          }
        },
        {
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: [1.963242, 48.622406]
          },
          properties: {
            id: '88bc36fb0db191928330b1e6',
            name: 'Les artisans du numérique',
            structureId: '6980ac85bc8c5c4c1bca7abd',
            isLabeledAidantsConnect: false,
            isLabeledFranceServices: false,
            address: 'ZI les deux clochers, 62300 Lens'
          }
        }
      ]
    };

    const getConseillersWithGeolocation = async () => [
      {
        _id: '4c38ebc9a06fdd532bf9d7be',
        structure: {
          _id: '98b3ca349340250d5d9a144e',
          nom: 'Association pour la formation au numérique à Bessenay',
          estLabelliseFranceServices: 'OUI',
          coordonneesInsee: {
            type: 'Point',
            coordinates: [
              3.158667,
              46.987344
            ]
          },
          insee: {
            etablissement: {
              adresse: {
                l1: 'Association pour la formation au numérique à Bessenay',
                l2: null,
                l3: null,
                l4: '6 rue de la Mairie',
                l5: null,
                l6: '69690 Bessenay',
                l7: 'France',
                numero_voie: '6',
                type_voie: 'rue',
                nom_voie: 'de la Mairie',
                complement_adresse: null,
                code_postal: '69690',
                localite: 'Bessenay',
                code_insee_localite: '69194',
                cedex: null
              },
            }
          }
        }
      },
      {
        _id: '88bc36fb0db191928330b1e6',
        structure: {
          _id: '6980ac85bc8c5c4c1bca7abd',
          nom: 'Les artisans du numérique',
          estLabelliseFranceServices: 'NON',
          coordonneesInsee: {
            type: 'Point',
            coordinates: [
              1.963242,
              48.622406
            ]
          },
          insee: {
            etablissement: {
              adresse: {
                l1: 'Les artisans du numérique',
                l2: 'ZI les deux clochers',
                l3: '62300, Lens',
                numero_voie: null,
                type_voie: null,
                nom_voie: null,
                complement_adresse: 'ZI les deux clochers',
                code_postal: '62300',
                localite: 'Lens',
                code_insee_localite: '62072',
                cedex: null
              },
            }
          }
        }
      }
    ];

    const getLieuxDePermanence = async () => [];

    const conseillers = await geolocatedConseillers({ getConseillersWithGeolocation, getLieuxDePermanence });

    expect(conseillers).toStrictEqual(expectedStructures);
  });

  it('devrait retourner un conseiller dont la structure n\'a pas d\'informations insee', async () => {
    const expectedStructures = {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: [3.158667, 46.987344]
          },
          properties: {
            id: '4c38ebc9a06fdd532bf9d7be',
            name: 'Association pour la formation au numérique à Bessenay',
            structureId: '98b3ca349340250d5d9a144e',
            isLabeledAidantsConnect: false,
            isLabeledFranceServices: true,
          }
        }
      ]
    };

    const getConseillersWithGeolocation = async () => [
      {
        _id: '4c38ebc9a06fdd532bf9d7be',
        structure: {
          _id: '98b3ca349340250d5d9a144e',
          nom: 'Association pour la formation au numérique à Bessenay',
          estLabelliseFranceServices: 'OUI',
          coordonneesInsee: {
            type: 'Point',
            coordinates: [
              3.158667,
              46.987344
            ]
          }
        }
      }
    ];

    const getLieuxDePermanence = async () => [];

    const conseillers = await geolocatedConseillers({ getConseillersWithGeolocation, getLieuxDePermanence });

    expect(conseillers).toStrictEqual(expectedStructures);
  });

  it('devrait utiliser les coordonnées gps de la commune lorsque les coordonnées de la structure ne sont pas disponibles', async () => {
    const expectedStructures = {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: [3.158667, 46.987344]
          },
          properties: {
            id: '4c38ebc9a06fdd532bf9d7be',
            name: 'Association pour la formation au numérique à Bessenay',
            structureId: '98b3ca349340250d5d9a144e',
            isLabeledAidantsConnect: false,
            isLabeledFranceServices: true
          }
        }
      ]
    };

    const getConseillersWithGeolocation = async () => [
      {
        _id: '4c38ebc9a06fdd532bf9d7be',
        structure: {
          _id: '98b3ca349340250d5d9a144e',
          nom: 'Association pour la formation au numérique à Bessenay',
          estLabelliseFranceServices: 'OUI',
          location: {
            type: 'Point',
            coordinates: [
              3.158667,
              46.987344
            ]
          }
        }
      }
    ];

    const getLieuxDePermanence = async () => [];

    const conseillers = await geolocatedConseillers({ getConseillersWithGeolocation, getLieuxDePermanence });

    expect(conseillers).toStrictEqual(expectedStructures);
  });

  it('devrait fusionner les lieux de permanence avec les structures', async () => {
    const expectedStructures = {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: [3.158667, 46.987344]
          },
          properties: {
            id: '4c38ebc9a06fdd532bf9d7be',
            name: 'Association pour la formation au numérique à Bessenay',
            structureId: '98b3ca349340250d5d9a144e',
            isLabeledAidantsConnect: false,
            isLabeledFranceServices: true
          }
        },
        {
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: [-1.0134, 46.8691]
          },
          properties: {
            id: '98acfe4a9849f8c4cfe9caf9',
            address: '6 RUE DU TOURNIQUET, 85500 LES HERBIERS',
            name: 'CCAS des HERBIERS',
            openingHours: [
              '8h00 - 12h30 | 13h30 - 18h00',
              '8h00 - 12h30 | 13h30 - 18h00',
              '8h00 - 12h30 | 13h30 - 18h00',
              '8h00 - 12h30 | 13h30 - 18h00',
              '8h00 - 12h30 | 13h30 - 18h00',
              '',
              ''
            ]
          }
        }
      ]
    };

    const getConseillersWithGeolocation = async () => [
      {
        _id: '4c38ebc9a06fdd532bf9d7be',
        structure: {
          _id: '98b3ca349340250d5d9a144e',
          nom: 'Association pour la formation au numérique à Bessenay',
          estLabelliseFranceServices: 'OUI',
          location: {
            type: 'Point',
            coordinates: [
              3.158667,
              46.987344
            ]
          }
        }
      }
    ];

    const getLieuxDePermanence = async () => [
      {
        _id: new ObjectID('98acfe4a9849f8c4cfe9caf9'),
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

    const conseillers = await geolocatedConseillers({ getConseillersWithGeolocation, getLieuxDePermanence });

    expect(conseillers).toStrictEqual(expectedStructures);
  });

  it('devrait retourner un conseiller dont la structure est labellisée aidants connect', async () => {
    const expectedStructures = {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: [3.158667, 46.987344]
          },
          properties: {
            id: '4c38ebc9a06fdd532bf9d7be',
            name: 'Association pour la formation au numérique à Bessenay',
            structureId: '98b3ca349340250d5d9a144e',
            isLabeledAidantsConnect: true,
            isLabeledFranceServices: false
          }
        }
      ]
    };

    const getConseillersWithGeolocation = async () => [
      {
        _id: '4c38ebc9a06fdd532bf9d7be',
        structure: {
          _id: '98b3ca349340250d5d9a144e',
          nom: 'Association pour la formation au numérique à Bessenay',
          estLabelliseFranceServices: 'NON',
          estLabelliseAidantsConnect: 'OUI',
          coordonneesInsee: {
            type: 'Point',
            coordinates: [
              3.158667,
              46.987344
            ]
          }
        }
      }
    ];

    const getLieuxDePermanence = async () => [];

    const conseillers = await geolocatedConseillers({ getConseillersWithGeolocation, getLieuxDePermanence });

    expect(conseillers).toStrictEqual(expectedStructures);
  });
});

describe('structure géolocalisée', () => {
  it('devrait retourner la structure localisé correspondant à l\'id', async () => {
    const structureId = '62a46ca2af2829d3cd298305';

    const getStructureWithGeolocation = async () => ({
      _id: '62a46ca2af2829d3cd298305',
      coordonneesInsee: {
        type: 'Point',
        coordinates: [
          3.158667,
          46.987344
        ]
      }
    });

    const expectedStructure = {
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [3.158667, 46.987344]
      }
    };

    const structure = await geolocatedStructure(structureId, { getStructureWithGeolocation });

    expect(structure).toStrictEqual(expectedStructure);
  });
});

describe('permanence géolocalisée', () => {
  it('devrait retourner la localisation de la permanence', async () => {
    const permanence = {
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
      horaires: []
    };

    const expectedStructure = {
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [
          -1.0134,
          46.8691
        ]
      }
    };

    const structure = await geolocatedPermanence(permanence);

    expect(structure).toStrictEqual(expectedStructure);
  });
});
