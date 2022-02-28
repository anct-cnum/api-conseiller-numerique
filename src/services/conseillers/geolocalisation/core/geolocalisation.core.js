const { formatAddress } = require('../../common/format-address');

const formatStructure = structure => ({
  name: structure.nom,
  isLabeledFranceServices: structure.estLabelliseFranceServices === 'OUI',
  ...structure.insee ? { address: formatAddress(structure.insee.etablissement.adresse) } : {}
});

const getGeometry = structure =>
  structure.coordonneesInsee ?
    { ...structure.coordonneesInsee } :
    { ...structure.location };

const toGeoJson = geolocatedConseiller => ({
  type: 'Feature',
  geometry: getGeometry(geolocatedConseiller.structure),
  properties: {
    id: geolocatedConseiller._id,
    structureId: geolocatedConseiller.structure._id,
    ...formatStructure(geolocatedConseiller.structure)
  }
});

const geolocatedStructure = async (structureId, { getStructureWithGeolocation }) => ({
  type: 'Feature',
  geometry: getGeometry(await getStructureWithGeolocation(structureId))
});

const geolocatedConseillers = async ({ getConseillersWithGeolocation }) => ({
  type: 'FeatureCollection',
  features: (await getConseillersWithGeolocation()).map(toGeoJson)
});

module.exports = {
  geolocatedStructure,
  geolocatedConseillers
};
