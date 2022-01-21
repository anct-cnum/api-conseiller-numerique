const { geolocatedConseillers } = require('./geolocalisation.core');

describe('conseillers géolocalisés', () => {
  it('devrait retourner les conseillers localisé sur leur structure d\'accueil', async () => {
    const expectedConseillers = {
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
            isLabeledFranceServices: false,
            address: 'ZI les deux clochers, 62300 Lens'
          }
        }
      ]
    };

    const getConseillerWithGeolocation = async () => [
      {
        _id: '4c38ebc9a06fdd532bf9d7be',
        structure: {
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

    const conseillers = await geolocatedConseillers({ getConseillerWithGeolocation });

    expect(conseillers).toStrictEqual(expectedConseillers);
  });

  it('devrait retourner un conseiller dont la structure n\'a pas d\'informations insee', async () => {
    const expectedConseillers = {
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
            isLabeledFranceServices: true,
          }
        }
      ]
    };

    const getConseillerWithGeolocation = async () => [
      {
        _id: '4c38ebc9a06fdd532bf9d7be',
        structure: {
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

    const conseillers = await geolocatedConseillers({ getConseillerWithGeolocation });

    expect(conseillers).toStrictEqual(expectedConseillers);
  });

  it('devrait utiliser les coordonnées gps de la commune lorsque les coordonnées de la structure ne sont pas disponibles', async () => {
    const expectedConseillers = {
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
            isLabeledFranceServices: true,
          }
        }
      ]
    };

    const getConseillerWithGeolocation = async () => [
      {
        _id: '4c38ebc9a06fdd532bf9d7be',
        structure: {
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

    const conseillers = await geolocatedConseillers({ getConseillerWithGeolocation });

    expect(conseillers).toStrictEqual(expectedConseillers);
  });
});
