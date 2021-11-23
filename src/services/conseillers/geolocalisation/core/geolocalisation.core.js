const toGeoJson = geolocatedConseiller => ({
  type: 'Feature',
  geometry: {
    type: 'Point',
    coordinates: [...geolocatedConseiller.location.coordinates]
  },
  properties: {
    name: `${geolocatedConseiller.prenom} ${geolocatedConseiller.nom}`,
  }
});

const geolocatedConseillers = async ({ getConseillerWithGeolocation }) => ({
  type: 'FeatureCollection',
  features: (await getConseillerWithGeolocation()).map(toGeoJson)
});


module.exports = {
  geolocatedConseillers
};
