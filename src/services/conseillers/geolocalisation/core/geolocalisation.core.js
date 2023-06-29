const { formatAddressFromInsee, formatAddressFromPermanence, formatOpeningHours } = require('../../common');

const formatStructure = structure => ({
  name: structure.nom,
  isLabeledAidantsConnect: structure.estLabelliseAidantsConnect === 'OUI',
  isLabeledFranceServices: structure.estLabelliseFranceServices === 'OUI',
  ...structure.insee ? { address: formatAddressFromInsee(structure.insee.adresse) } : {}
});

const getGeometry = structure =>
  structure.coordonneesInsee ?
    { ...structure.coordonneesInsee } :
    { ...structure.location };

const toGeoJsonFromConseillersWithGeolocation = geolocatedConseiller => ({
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

const geolocatedPermanence = async permanence => ({
  type: 'Feature',
  geometry: permanence.location
});

const toGeoJsonFromPermanence = permanence => ({
  type: 'Feature',
  geometry: permanence.location,
  properties: {
    id: permanence._id.toString(),
    address: formatAddressFromPermanence(permanence.adresse),
    name: permanence.nomEnseigne,
    openingHours: formatOpeningHours(permanence.horaires)
  }
});

const geolocatedConseillers = async ({ getConseillersWithGeolocation, getLieuxDePermanence }) => ({
  type: 'FeatureCollection',
  features: [
    ...(await getConseillersWithGeolocation()).map(toGeoJsonFromConseillersWithGeolocation),
    ...(await getLieuxDePermanence()).map(toGeoJsonFromPermanence)
  ]
});

module.exports = {
  geolocatedStructure,
  geolocatedPermanence,
  geolocatedConseillers
};
