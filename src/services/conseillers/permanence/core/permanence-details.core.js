const { formatAddressFromInsee, formatAddressFromPermanence, formatOpeningHours } = require('../../common');

const permanenceFormattedAddress = formattedAddress =>
  formattedAddress === '' ? {} : {
    adresse: formattedAddress
  };

const permanenceAddress = permanence =>
  permanenceFormattedAddress(
    formatAddressFromInsee(permanence.insee?.etablissement.adresse ?? {})
  );

const permanenceContactEmail = permanence =>
  permanence.contact.email ? {
    email: permanence.contact.email
  } : {};

const digitsPairsRegexp = /(\d\d(?!$))/g;

const setPhoneSpaces = telephone => telephone.includes(' ') ?
  telephone : telephone.replace(digitsPairsRegexp, '$1 ');

const permanenceContactTelephone = permanence =>
  permanence.contact.telephone ? {
    telephone: setPhoneSpaces(permanence.contact.telephone)
  } : {};

const permanenceContact = permanence =>
  permanence.contact ? {
    ...permanenceContactEmail(permanence),
    ...permanenceContactTelephone(permanence)
  } : {};

const permanenceCoordinates = coordinates => coordinates ? { coordinates } : {};

const structureToPermanenceDetailsTransfer = permanence => ({
  ...permanenceAddress(permanence),
  nom: permanence.nom,
  ...permanenceContact(permanence),
  ...permanenceCoordinates(permanence.coordonneesInsee?.coordinates)
});

const cnfsDetails = cnfs => ({
  cnfs,
  nombreCnfs: cnfs.length,
});

const permanenceDetailsFromStructureId = async (structureId, { getStructureById, getCnfs }) => ({
  ...structureToPermanenceDetailsTransfer(await getStructureById(structureId)),
  ...cnfsDetails(await getCnfs(structureId))
});

const permanenceDetails = async permanence => ({
  adresse: formatAddressFromPermanence(permanence.adresse),
  coordinates: permanence.location.coordinates,
  nom: permanence.nomEnseigne,
  ...(permanence.email ? { email: permanence.email } : {}),
  ...(permanence.numeroTelephone ? { telephone: setPhoneSpaces(permanence.numeroTelephone) } : {}),
  ...(permanence.siteWeb ? { siteWeb: permanence.siteWeb } : {}),
  typeAcces: permanence.typeAcces,
  openingHours: formatOpeningHours(permanence.horaires ?? []),
  nombreCnfs: permanence.conseillers?.length ?? 0,
  cnfs: permanence.conseillers ?? []
});

module.exports = {
  permanenceDetailsFromStructureId,
  permanenceDetails
};
