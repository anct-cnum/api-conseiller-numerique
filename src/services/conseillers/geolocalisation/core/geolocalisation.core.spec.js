const { geolocatedConseillers } = require('./geolocalisation.core');

describe('geolocated conseillers', () => {
  it('devrait retourner les conseillers localisé sur leur structure d\'accueil', async () => {
    const expectedConseillers = [
      {
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [2.2622, 48.872]
        },
        properties: {
          name: 'John Doe',
        }
      },
      {
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [1.9632, 48.6206]
        },
        properties: {
          name: 'Bob Doe'
        }
      }
    ];

    const getConseillerWithGeolocation = async () => [
      {
        prenom: 'John',
        nom: 'Doe',
        location: {
          type: 'Point',
          coordinates: [
            2.2622,
            48.872
          ]
        }
      },
      {
        prenom: 'Bob',
        nom: 'Doe',
        location: {
          type: 'Point',
          coordinates: [
            1.9632,
            48.6206
          ]
        }
      }
    ];

    const conseillers = await geolocatedConseillers({ getConseillerWithGeolocation });

    expect(conseillers).toStrictEqual(expectedConseillers);
  });
});
