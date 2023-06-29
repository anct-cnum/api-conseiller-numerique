const { formatAddressFromInsee, formatAddressFromPermanence, formatOpeningHours } = require('../../common');

const emptyString = '';

const typeAccesMap = new Map([
  ['prive', 'La structure n\'accueille pas de public'],
  ['libre', 'Accès libre'],
  ['rdv', 'Sur rendez-vous']
]);

const permanenceFormattedAddress = formattedAddress =>
  formattedAddress === emptyString ? {} : {
    adresse: formattedAddress
  };

const permanenceAddress = permanence =>
  permanenceFormattedAddress(
    formatAddressFromInsee(permanence.insee.adresse ?? {})
  );

const permanenceContactEmail = permanence =>
  permanence.contact.email ? {
    email: permanence.contact.email
  } : {};

const frenchCallingPhoneCodeRegexp = /(?:(\+(?:33|590|596|594|262|269))(\d))?/;
const digitsPairsRegexp = /(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})?/;
const phoneRegexp = frenchCallingPhoneCodeRegexp.source + digitsPairsRegexp.source;
const phoneSpace = ' ';
const regexpMatchesToSkip = 1;

const noUndefinedMatches = match => match !== undefined;

const setPhoneSpaces = telephone => telephone
.replaceAll(phoneSpace, emptyString)
.match(phoneRegexp)
?.slice(regexpMatchesToSkip)
.filter(noUndefinedMatches)
.join(phoneSpace);

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
  isLabeledAidantsConnect: permanence.estLabelliseAidantsConnect === 'OUI',
  isLabeledFranceServices: permanence.estLabelliseFranceServices === 'OUI',
  ...permanenceContact(permanence),
  ...permanenceCoordinates(permanence.coordonneesInsee?.coordinates)
});

const cnfsDetails = cnfs => {
  cnfs = cnfs.map(conseiller => ({
    prenom: conseiller.nonAffichageCarto !== true ? conseiller.prenom : 'Anonyme',
    nom: conseiller.nonAffichageCarto !== true ? conseiller.nom : '',
    ...(conseiller.nonAffichageCarto !== true && conseiller.emailPro !== undefined && { email: conseiller.emailPro }),
    ...(conseiller.nonAffichageCarto !== true && conseiller.telephonePro !== undefined && { phone: conseiller.telephonePro })
  }));

  return { cnfs, nombreCnfs: cnfs.length };
};

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
  typeAcces: permanence.typeAcces.map(type => typeAccesMap.get(type)).join(', '),
  openingHours: formatOpeningHours(permanence.horaires ?? []),
  nombreCnfs: permanence.conseillers?.length ?? 0,
  cnfs: permanence.conseillers ?? []
});

const compare = (horairesAgregees, horaires) => {
  let timeA = new Date();
  timeA.setHours(horairesAgregees.split(':')[0], horairesAgregees.split(':')[1], '00');
  let timeB = new Date();
  timeB.setHours(horaires.split(':')[0], horaires.split(':')[1], '00');
  return timeA > timeB;
};

const aggregationByLocation = async (permanencesByLocation, permanenceById) => {

  const horairesAgregees = [];
  const conseillersAgreges = [];

  permanencesByLocation.forEach(permanence => {
    if (permanence.horaires === undefined) {
      return;
    }
    permanence.horaires.forEach((horaires, i) => {
      if (!horairesAgregees[i]) {
        horairesAgregees.push(horaires);
      } else if (horairesAgregees[i] !== horaires) {
        if (horairesAgregees[i].matin[0] === 'Fermé') {
          horairesAgregees[i].matin = horaires.matin;
        } else if (horaires.matin[0] !== 'Fermé' && compare(horairesAgregees[i].matin[0], horaires.matin[0])) {
          horairesAgregees[i].matin[0] = horaires.matin[0];
        } else if (horaires.matin[1] !== 'Fermé' && !compare(horairesAgregees[i].matin[1], horaires.matin[1])) {
          horairesAgregees[i].matin[1] = horaires.matin[1];
        }

        if (horairesAgregees[i].apresMidi[0] === 'Fermé') {
          horairesAgregees[i].apresMidi = horaires.apresMidi;
        } else if (horaires.apresMidi[0] !== 'Fermé' && compare(horairesAgregees[i].apresMidi[0], horaires.apresMidi[0])) {
          horairesAgregees[i].apresMidi[0] = horaires.apresMidi[0];
        } else if (horaires.apresMidi[1] !== 'Fermé' && !compare(horairesAgregees[i].apresMidi[1], horaires.apresMidi[1])) {
          horairesAgregees[i].apresMidi[1] = horaires.apresMidi[1];
        }
      }
    });

    permanence.conseillers.forEach(conseiller => {
      conseillersAgreges.push(conseiller);
    });
  });

  permanenceById.horaires = horairesAgregees;
  permanenceById.conseillers = conseillersAgreges;

  return permanenceById;
};


module.exports = {
  permanenceDetailsFromStructureId,
  permanenceDetails,
  aggregationByLocation
};
