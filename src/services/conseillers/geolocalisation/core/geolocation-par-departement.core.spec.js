const { geolocatedConseillersByDepartement } = require('./geolocation-par-departement.core');

describe('conseillers géolocalisés par département', () => {
  it('devrait retourner la liste des conseillers géolocalisés pour chaque département', async () => {
    const expectedConseillerWithGeolocationByDepartement = {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: [
              5.348666025399395,
              46.099798450280282
            ]
          },
          properties: {
            codeDepartement: '01',
            nomDepartement: 'Ain',
            boundingZoom: 10,
            count: 72
          }
        },
        {
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: [
              3.559228138131865,
              49.561047640550804
            ]
          },
          properties: {
            codeDepartement: '02',
            nomDepartement: 'Aisne',
            boundingZoom: 10,
            count: 44
          }
        },
        {
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: [
              45.147364453253317,
              -12.820655090736881
            ]
          },
          properties: {
            codeDepartement: '976',
            nomDepartement: 'Mayotte',
            boundingZoom: 11,
            count: 2
          }
        }
      ]
    };

    const getConseillersByCodeDepartement = async () => [
      { _id: '01', count: 72 },
      { _id: '02', count: 44 },
      { _id: '976', count: 2 },
    ];

    const conseillersByDepartement = await geolocatedConseillersByDepartement({ getConseillersByCodeDepartement });

    expect(conseillersByDepartement).toStrictEqual(expectedConseillerWithGeolocationByDepartement);
  });

  it('ne devrait pas retourner la liste des conseillers géolocalisés par département si le département n\'existe pas', async () => {
    const expectedConseillerWithGeolocationByDepartement = {
      type: 'FeatureCollection',
      features: []
    };

    const getConseillersByCodeDepartement = async () => [
      { _id: '', count: 72 },
      { _id: '2C', count: 44 },
    ];

    const conseillersByDepartement = await geolocatedConseillersByDepartement({ getConseillersByCodeDepartement });

    expect(conseillersByDepartement).toStrictEqual(expectedConseillerWithGeolocationByDepartement);
  });
});
