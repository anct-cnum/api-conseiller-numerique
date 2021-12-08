const { geolocatedConseillers } = require('./geolocalisation.core');

describe('geolocated conseillers', () => {
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
            conseiller: {
              name: 'John Doe',
              email: 'john.doe@conseiller-numerique.fr',
            },
            structure: {
              name: 'Association pour la formation au numérique à Bessenay',
              isLabeledFranceServices: true,
              phone: '0474728936',
              address: '6 rue de la Mairie, 69690 Bessenay'
            }
          }
        },
        {
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: [1.963242, 48.622406]
          },
          properties: {
            conseiller: {
              name: 'Bob Doe',
              email: 'bob.doe@conseiller-numerique.fr',
            },
            structure: {
              name: 'Les artisans du numérique',
              isLabeledFranceServices: false,
              phone: '0116589632',
              address: 'ZI les deux clochers, 62300 Lens'
            }
          }
        }
      ]
    };

    const getConseillerWithGeolocation = async () => [
      {
        prenom: 'John',
        nom: 'Doe',
        emailCN: {
          address: 'john.doe@conseiller-numerique.fr'
        },
        structure: {
          nom: 'Association pour la formation au numérique à Bessenay',
          estLabelliseFranceServices: 'OUI',
          contact: {
            telephone: '0474728936'
          },
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
        prenom: 'Bob',
        nom: 'Doe',
        emailCN: {
          address: 'bob.doe@conseiller-numerique.fr'
        },
        structure: {
          nom: 'Les artisans du numérique',
          estLabelliseFranceServices: 'NON',
          contact: {
            telephone: '0116589632'
          },
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

  it('devrait retourner un conseiller dont la structure d\'accueil n\'a pas d\'information de contact', async () => {
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
            conseiller: {
              name: 'John Doe',
              email: 'john.doe@conseiller-numerique.fr',
            },
            structure: {
              name: 'Association pour la formation au numérique à Bessenay',
              isLabeledFranceServices: true,
              address: '6 rue de la Mairie, 69690 Bessenay'
            }
          }
        }
      ]
    };

    const getConseillerWithGeolocation = async () => [
      {
        prenom: 'John',
        nom: 'Doe',
        emailCN: {
          address: 'john.doe@conseiller-numerique.fr'
        },
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
                numero_voie: '6',
                type_voie: 'rue',
                nom_voie: 'de la Mairie',
                code_postal: '69690',
                localite: 'Bessenay',
                code_insee_localite: '69194'
              },
            }
          }
        }
      }
    ];

    const conseillers = await geolocatedConseillers({ getConseillerWithGeolocation });

    expect(conseillers).toStrictEqual(expectedConseillers);
  });

  it('devrait retourner un conseiller qui n\'a pas d\'email cnfs', async () => {
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
            conseiller: {
              name: 'John Doe',
            },
            structure: {
              name: 'Association pour la formation au numérique à Bessenay',
              isLabeledFranceServices: true,
              address: '6 rue de la Mairie, 69690 Bessenay'
            }
          }
        }
      ]
    };

    const getConseillerWithGeolocation = async () => [
      {
        prenom: 'John',
        nom: 'Doe',
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
                numero_voie: '6',
                type_voie: 'rue',
                nom_voie: 'de la Mairie',
                code_postal: '69690',
                localite: 'Bessenay',
                code_insee_localite: '69194'
              },
            }
          }
        }
      }
    ];

    const conseillers = await geolocatedConseillers({ getConseillerWithGeolocation });

    expect(conseillers).toStrictEqual(expectedConseillers);
  });
});
