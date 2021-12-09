const addressGroupSeparator = ' ';
const addressPartSeparator = ', ';

const isValidAddressPart = addressPart => addressPart !== undefined && addressPart !== null && addressPart.trim() !== '';

const addressGroup = addressParts => addressParts.filter(isValidAddressPart).join(addressGroupSeparator);

const formatAddress = adresse => [
  addressGroup([
    adresse.numero_voie,
    adresse.type_voie,
    adresse.nom_voie
  ]),
  adresse.complement_adresse,
  addressGroup([
    adresse.code_postal,
    adresse.localite
  ]),
].filter(isValidAddressPart).join(addressPartSeparator);

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
