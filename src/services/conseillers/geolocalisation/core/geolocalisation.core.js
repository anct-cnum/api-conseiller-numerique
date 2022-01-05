const { formatAddress } = require('../../common/format-address');

const formatStructure = structure => ({
  name: structure.nom,
  isLabeledFranceServices: structure.estLabelliseFranceServices === 'OUI',
  ...structure.insee ? { address: formatAddress(structure.insee.etablissement.adresse) } : {}
});

const toGeoJson = geolocatedConseiller => ({
  type: 'Feature',
  geometry: { ...geolocatedConseiller.structure.coordonneesInsee },
  properties: {
    id: geolocatedConseiller._id,
    ...formatStructure(geolocatedConseiller.structure)
  }
});

const geolocatedConseillers = async ({ getConseillerWithGeolocation }) => ({
  type: 'FeatureCollection',
  features: (await getConseillerWithGeolocation()).map(toGeoJson)
});

module.exports = {
  geolocatedConseillers
};
