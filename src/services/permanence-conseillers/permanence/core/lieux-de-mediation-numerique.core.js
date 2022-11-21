const { toOsmOpeningHours, OSM_DAYS_OF_WEEK } = require('../utils/osm-opening-hours/osm-opening-hours');

// eslint-disable-next-line max-len
const URL_REGEXP = /^(?:https?:\/\/)?(?:(?!(?:10|127)(?:\.\d{1,3}){3})(?!(?:169\.254|192\.168)(?:\.\d{1,3}){2})(?!172\.(?:1[6-9]|2\d|3[0-1])(?:\.\d{1,3}){2})(?:[1-9]\d?|1\d\d|2[01]\d|22[0-3])(?:\.(?:1?\d{1,2}|2[0-4]\d|25[0-5])){2}\.(?:[1-9]\d?|1\d\d|2[0-4]\d|25[0-4])|(?:[a-z\u00a1-\uffff\d]-*)*[a-z\u00a1-\uffff\d]+(?:\.(?:[a-z\u00a1-\uffff\d]-*)*[a-z\u00a1-\uffff\d]+)*\.[a-z\u00a1-\uffff]{2,})(?::\d{2,5})?(?:\/\S*)?$/;

const PHONE_REGEX = /^(?:(?:\+)(33|590|596|594|262|269))(?:\d{3}){3}$/;

const removeAllSpaces = string => string?.replaceAll(' ', '') ?? null;

const formatPhone = telephone => removeAllSpaces(
  telephone
  ?.replaceAll('.', '')
  ?.replaceAll('+33 ', '+33')
  ?.replaceAll('+330', '+33')
);

const removeAllSpacesAndDuplicateHttpPrefix = siteWeb => removeAllSpaces(siteWeb?.replace('https://www.http', 'http'));

const addMissingHttpsPrefix = siteWeb =>
  siteWeb && (siteWeb.startsWith('https://') || siteWeb.startsWith('http://')) ? siteWeb : `https://${siteWeb}`;

const removeSuperfluousSpaces = string => string?.trim().replaceAll(/\s+/g, ' ') ?? null;

const nullOrEmpty = string => string === null || string === '';

const invalidLieux = lieu =>
  !nullOrEmpty(lieu.id) &&
  !nullOrEmpty(lieu.nom) &&
  !nullOrEmpty(lieu.commune) &&
  !nullOrEmpty(lieu.code_postal) &&
  !nullOrEmpty(lieu.adresse) &&
  lieu.hasOwnProperty('aidants') &&
  !nullOrEmpty(lieu.structureId);

const removeNullStrings = string => string
.replaceAll('null null', '')
.replaceAll('null ', '');

const pivotIfAny = pivot => pivot ? {
  pivot: removeAllSpaces(pivot)
} : {};

const priseRdvIfAny = priseRdv => {
  const fixedPriseRdv = addMissingHttpsPrefix(removeAllSpacesAndDuplicateHttpPrefix(priseRdv));

  return fixedPriseRdv && URL_REGEXP.test(fixedPriseRdv) ? {
    prise_rdv: fixedPriseRdv
  } : {};
};

const coordonneesGPSIfAny = coordinates => coordinates ? {
  latitude: coordinates[1],
  longitude: coordinates[0]
} : {};

const checkLengthPhone = telephone =>
  PHONE_REGEX.test(telephone) || (telephone.startsWith('0') && telephone.length === 10);

const telephoneIfAny = telephone => {
  const formattedTel = formatPhone(telephone);

  return formattedTel && checkLengthPhone(formattedTel) ? {
    telephone: formattedTel
  } : {};
};

const courrielIfAny = courriel => courriel ? {
  courriel: removeAllSpaces(courriel)
} : {};

const siteWebIfAny = siteWeb => {
  const fixedSiteWeb = addMissingHttpsPrefix(removeAllSpacesAndDuplicateHttpPrefix(siteWeb));

  return fixedSiteWeb && URL_REGEXP.test(fixedSiteWeb) ? {
    site_web: fixedSiteWeb
  } : {};
};

const toTimeTable = horaires => (horaires ?? []).map(horaire => [
  horaire.matin,
  horaire.apresMidi
]
.flat()
.filter(horaire => horaire !== 'Fermé'))
.map(horaire =>
  horaire.length === 4 ? [
    [horaire[0], horaire[1]].join('-'),
    [horaire[2], horaire[3]].join('-')
  ].join(',') : horaire.join('-')).map((osmHours, index) => ({
  day: OSM_DAYS_OF_WEEK[index],
  osmHours
})).filter(openingHour => openingHour.osmHours !== '');

const osmOpeningHoursIfAny = horaires =>
  horaires.length === 0 ? {} : {
    horaires: toOsmOpeningHours(horaires)
  };

const CNFS_COMMON_SERVICES = [
  'Prendre en main un smartphone ou une tablette',
  'Prendre en main un ordinateur',
  'Utiliser le numérique au quotidien',
  'Approfondir ma culture numérique'
].join(', ');

const dateMajIfAny = updatedAt => updatedAt ? {
  date_maj: updatedAt.toISOString().substring(0, 10)
} : {};


const labelsNationauxIfAny = structure => ({
  labels_nationaux: [
    'CNFS',
    ...(structure?.estLabelliseAidantsConnect === 'OUI') ? ['Aidants Connect'] : [],
    ...(structure?.estLabelliseFranceServices === 'OUI') ? ['France Services'] : []
  ].join(', ')
});

const formatNomAidant = (prenom, nom) => ({
  nom: (prenom + ' ' + nom).toLowerCase().replace(/(^\w{1})|([\s,-]+\w{1})/g, letter => letter.toUpperCase())
});

const removeDuplicates = array => {
  const seen = new Set();
  return array.filter(el => {
    const duplicate = seen.has(el._id);
    seen.add(el._id);
    return !duplicate;
  });
};

const aidantsIfAny = aidants =>
  // Retire les aidants souhaitant être "anonyme"
  aidants?.filter(aidant => aidant.nonAffichageCarto !== true)?.length > 0 ? {
    aidants:
    removeDuplicates(aidants)
    .map(aidant => ({
      aidantId: aidant._id,
      ...formatNomAidant(aidant.prenom, aidant.nom),
      ...courrielIfAny(aidant.emailPro),
      ...telephoneIfAny(aidant.telephonePro)
    }))
    // eslint-disable-next-line no-nested-ternary
    .sort((aidant1, aidant2) => (aidant1.nom > aidant2.nom) ? 1 : ((aidant2.nom > aidant1.nom) ? -1 : 0))
  } : {};

const lieuxDeMediationNumerique = async ({ getPermanences }) =>
  (await getPermanences()).map(permanence => ({
    id: permanence._id,
    nom: removeSuperfluousSpaces(permanence.nomEnseigne),
    commune: removeSuperfluousSpaces(permanence.adresse?.ville),
    code_postal: removeAllSpaces(permanence.adresse?.codePostal),
    adresse: removeSuperfluousSpaces(removeNullStrings([permanence.adresse.numeroRue, permanence.adresse.rue].join(' '))),
    ...coordonneesGPSIfAny(permanence.location?.coordinates),
    ...telephoneIfAny(permanence.numeroTelephone),
    ...courrielIfAny(permanence.email),
    ...siteWebIfAny(permanence.siteWeb),
    ...osmOpeningHoursIfAny(toTimeTable(permanence.horaires)),
    source: 'conseiller-numerique',
    ...dateMajIfAny(permanence.updatedAt),
    services: CNFS_COMMON_SERVICES,
    conditions_access: 'Gratuit',
    ...labelsNationauxIfAny(permanence.structure),
    ...priseRdvIfAny(permanence.structure?.urlPriseRdv),
    ...pivotIfAny(permanence.siret),
    structureId: permanence.structure?._id,
    ...aidantsIfAny(permanence.aidants),
  })).filter(invalidLieux);

module.exports = {
  lieuxDeMediationNumerique,
  CNFS_COMMON_SERVICES
};
