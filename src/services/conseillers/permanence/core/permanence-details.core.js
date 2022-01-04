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

const toPermanenceDetailsTransfer = permanence => ({
  ...permanenceAddress(permanence),
  nom: permanence.nom,
  ...permanenceContact(permanence)
});

const permanenceDetails = async (structureId, { getPermanenceByStructureId, getNombreCnfs }) => ({
  ...toPermanenceDetailsTransfer(await getPermanenceByStructureId(structureId)),
  nombreCnfs: await getNombreCnfs(structureId)
});

module.exports = {
  permanenceDetails
};
