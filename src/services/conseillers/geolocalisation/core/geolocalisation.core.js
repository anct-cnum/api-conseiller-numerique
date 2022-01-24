const { formatAddress } = require('../../common/format-address');

const formatStructure = structure => ({
  name: structure.nom,
  isLabeledFranceServices: structure.estLabelliseFranceServices === 'OUI',
  ...structure.insee ? { address: formatAddress(structure.insee.etablissement.adresse) } : {}
});

const getGeometry = geolocatedConseiller =>
  geolocatedConseiller.structure.coordonneesInsee ?
    { ...geolocatedConseiller.structure.coordonneesInsee } :
    { ...geolocatedConseiller.structure.location };

const toGeoJson = geolocatedConseiller => ({
  type: 'Feature',
  geometry: getGeometry(geolocatedConseiller),
  properties: {
    id: geolocatedConseiller._id,
    structureId: geolocatedConseiller.structure._id,
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
