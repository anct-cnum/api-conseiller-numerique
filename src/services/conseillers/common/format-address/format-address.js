const addressGroupSeparator = ' ';
const addressPartSeparator = ', ';

const isValidAddressPart = addressPart => addressPart !== undefined && addressPart !== null && addressPart.trim() !== '';

const addressGroup = addressParts => addressParts.filter(isValidAddressPart).join(addressGroupSeparator);

const formatAddressFromInsee = adresse => [
  addressGroup([
    adresse.numero_voie,
    adresse.type_voie,
    adresse.libelle_voie
  ]),
  adresse.complement_adresse,
  addressGroup([
    adresse.code_postal,
    adresse.libelle_commune
  ]),
].filter(isValidAddressPart).join(addressPartSeparator);

const formatAddressFromPermanence = adresse => [
  addressGroup([
    adresse.numeroRue,
    adresse.rue
  ]),
  addressGroup([
    adresse.codePostal,
    adresse.ville
  ]),
].filter(isValidAddressPart).join(addressPartSeparator);

module.exports = {
  formatAddressFromInsee,
  formatAddressFromPermanence
};
