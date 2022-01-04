const { formatAddress } = require('../../common/format-address');

const formatStructure = structure => ({
  name: structure.nom,
  isLabeledFranceServices: structure.estLabelliseFranceServices === 'OUI',
  ...structure.contact?.telephone ? { phone: structure.contact.telephone } : {},
  ...structure.insee ? { address: formatAddress(structure.insee.etablissement.adresse) } : {}
});

const formatConseiller = conseiller => ({
  name: `${conseiller.prenom} ${conseiller.nom}`,
  ...conseiller.emailCN?.address ? { email: conseiller.emailCN.address } : {},
});

const toGeoJson = geolocatedConseiller => ({
  type: 'Feature',
  geometry: { ...geolocatedConseiller.structure.coordonneesInsee },
  properties: {
    conseiller: formatConseiller(geolocatedConseiller),
    structure: formatStructure(geolocatedConseiller.structure)
  }
});

const geolocatedConseillers = async ({ getConseillerWithGeolocation }) => ({
  type: 'FeatureCollection',
  features: (await getConseillerWithGeolocation()).map(toGeoJson)
});

module.exports = {
  geolocatedConseillers
};
