const toGeoJson = geolocatedConseiller => ({
  type: 'Feature',
  geometry: { ...geolocatedConseiller.location },
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
