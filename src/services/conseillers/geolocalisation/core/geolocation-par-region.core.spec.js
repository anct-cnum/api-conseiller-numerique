const { geolocatedConseillersByRegion } = require('./geolocation-par-region.core');

describe('conseillers géolocalisés par région', () => {
  it('devrait retourner la liste des conseillers géolocalisés par région pour un seul département', async () => {
    const expectedConseillerWithGeolocationByRegion = {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: [
              4.538056,
              45.515833
            ]
          },
          properties: {
            region: 'Auvergne-Rhône-Alpes',
            boundingZoom: 8,
            count: 72
          }
        }
      ]
    };

    const getConseillersByCodeDepartement = async () => [
      { _id: '01', count: 72 }
    ];

    const conseillersByRegion = await geolocatedConseillersByRegion({ getConseillersByCodeDepartement });

    expect(conseillersByRegion).toStrictEqual(expectedConseillerWithGeolocationByRegion);
  });

  it('devrait retourner la liste des conseillers géolocalisés par région pour deux départements dans la même région', async () => {
    const expectedConseillerWithGeolocationByRegion = {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: [
              4.538056,
              45.515833
            ]
          },
          properties: {
            region: 'Auvergne-Rhône-Alpes',
            boundingZoom: 8,
            count: 72
          }
        }
      ]
    };

    const getConseillersByCodeDepartement = async () => [
      { _id: '01', count: 45 },
      { _id: '03', count: 27 }
    ];

    const conseillersByRegion = await geolocatedConseillersByRegion({ getConseillersByCodeDepartement });

    expect(conseillersByRegion).toStrictEqual(expectedConseillerWithGeolocationByRegion);
  });

  it('devrait retourner la liste des conseillers géolocalisés par région pour deux départements dans des régions différentes', async () => {
    const expectedConseillerWithGeolocationByRegion = {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: [
              4.538056,
              45.515833
            ]
          },
          properties: {
            region: 'Auvergne-Rhône-Alpes',
            boundingZoom: 8,
            count: 72
          }
        },
        {
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: [
              2.775278,
              49.966111
            ]
          },
          properties: {
            region: 'Hauts-de-France',
            boundingZoom: 8,
            count: 11
          }
        }
      ]
    };

    const getConseillersByCodeDepartement = async () => [
      { _id: '01', count: 72 },
      { _id: '02', count: 11 }
    ];

    const conseillersByRegion = await geolocatedConseillersByRegion({ getConseillersByCodeDepartement });

    expect(conseillersByRegion).toStrictEqual(expectedConseillerWithGeolocationByRegion);
  });

  it('ne devrait pas retourner la liste des conseillers géolocalisés par région si le département n\'existe pas', async () => {
    const expectedConseillerWithGeolocationByRegion = {
      type: 'FeatureCollection',
      features: []
    };

    const getConseillersByCodeDepartement = async () => [
      { _id: '', count: 72 }
    ];

    const conseillersByRegion = await geolocatedConseillersByRegion({ getConseillersByCodeDepartement });

    expect(conseillersByRegion).toStrictEqual(expectedConseillerWithGeolocationByRegion);
  });
});
