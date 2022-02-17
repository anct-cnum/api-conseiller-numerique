const { formatAddress } = require('../../common/format-address');

const permanenceFormattedAddress = formattedAddress =>
  formattedAddress === '' ? {} : {
    adresse: formattedAddress
  };

const permanenceAddress = permanence =>
  permanenceFormattedAddress(
    formatAddress(permanence.insee?.etablissement.adresse ?? {})
  );

const permanenceContactEmail = permanence =>
  permanence.contact.email ? {
    email: permanence.contact.email
  } : {};

const digitsPairsRegexp = /(\d\d(?!$))/g;

const setSpaces = permanence => permanence.contact.telephone.includes(' ') ?
  permanence.contact.telephone :
  permanence.contact.telephone
  .replace(digitsPairsRegexp, '$1 ');

const permanenceContactTelephone = permanence =>
  permanence.contact.telephone ? {
    telephone: setSpaces(permanence)
  } : {};

const permanenceContact = permanence =>
  permanence.contact ? {
    ...permanenceContactEmail(permanence),
    ...permanenceContactTelephone(permanence)
  } : {};

const permanenceCoordinates = coordinates => coordinates ? { coordinates } : {};

const toPermanenceDetailsTransfer = permanence => ({
  ...permanenceAddress(permanence),
  nom: permanence.nom,
  ...permanenceContact(permanence),
  ...permanenceCoordinates(permanence.coordonneesInsee?.coordinates)
});

const cnfsDetails = cnfs => ({
  cnfs,
  nombreCnfs: cnfs.length,
});

const permanenceDetails = async (structureId, { getPermanenceByStructureId, getCnfs }) => ({
  ...toPermanenceDetailsTransfer(await getPermanenceByStructureId(structureId)),
  ...cnfsDetails(await getCnfs(structureId))
});

module.exports = {
  permanenceDetails
};
