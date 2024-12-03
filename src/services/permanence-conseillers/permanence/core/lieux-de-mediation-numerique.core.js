const { toOsmOpeningHours, OSM_DAYS_OF_WEEK } = require('../utils/osm-opening-hours/osm-opening-hours');
const { Pivot, Adresse, Localisation, Contact, ConditionsAcces, Services, LabelsNationaux, Url, Service,
  LabelNational, ConditionAcces, toSchemaLieuMediationNumerique, Id, Nom, NomError, IdError, CommuneError, CodePostalError, VoieError
} = require('@gouvfr-anct/lieux-de-mediation-numerique');
const { AidantsError } = require('./aidants-error');

const URL_REGEXP = /^(?:https?:\/\/)?(?:(?!(?:10|127)(?:\.\d{1,3}){3})(?!(?:169\.254|192\.168)(?:\.\d{1,3}){2})(?!172\.(?:1[6-9]|2\d|3[0-1])(?:\.\d{1,3}){2})(?:[1-9]\d?|1\d\d|2[01]\d|22[0-3])(?:\.(?:1?\d{1,2}|2[0-4]\d|25[0-5])){2}\.(?:[1-9]\d?|1\d\d|2[0-4]\d|25[0-4])|(?:[a-z0-9@:%._\\+~#=]-*))*\.[a-zA-Z@:%._\\+~#=]{2,}(?::\d{2,5})?(?:\/\S*)?$/;

const PHONE_REGEX = /^(?:(?:\+)(33|590|596|594|262|269))(?:\d{3}){3}$/;

const COURRIEL_REGEXP = /^(?:(?:[^<>()[\]\\.,;:\s@"]+(?:\.[^<>()[\]\\.,;:\s@"]+)*)|(?:".+"))@(?:(?:\[\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}])|(?:(?:[A-Za-zÀ-ÖØ-öø-ÿ\-\d]+\.)+[a-zA-Z]{2,}))$/;

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

const formatUrl = url => addMissingHttpsPrefix(removeAllSpacesAndDuplicateHttpPrefix(url));

const removeSuperfluousSpaces = string => string?.trim().replaceAll(/\s+/g, ' ') ?? '';

const keepDefined = lieu => lieu !== undefined;

const removeNullStrings = string => string
.replaceAll('null null', '')
.replaceAll('null ', '');

const priseRdvIfAny = priseRdv => priseRdv && URL_REGEXP.test(priseRdv) ? { prise_rdv: Url(priseRdv) } : {};

const checkLengthPhone = telephone =>
  PHONE_REGEX.test(telephone) || (telephone.startsWith('0') && telephone.length === 10);

const telephoneIfAny = telephone => telephone && checkLengthPhone(telephone) ? { telephone } : {};

const courrielIfAny = courriel => courriel && COURRIEL_REGEXP.test(courriel) ? { courriel } : {};

const siteWebIfAny = siteWeb => siteWeb && URL_REGEXP.test(siteWeb) ? { site_web: [siteWeb] } : {};

const isPrivate = acces => acces && acces.includes('prive') ? { prive: true } : {};

const toTimeTable = horaires => (horaires ?? []).map(horaire => [horaire.matin, horaire.apresMidi]
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

const horairesIfAny = horaires => horaires ? { horaires } : {};

const CNFS_COMMON_SERVICES = [
  Service.PrendreEnMainUnSmartphoneOuUneTablette,
  Service.PrendreEnMainUnOrdinateur,
  Service.UtiliserLeNumerique,
  Service.ApprofondirMaCultureNumerique
];

const labelsNationaux = structure =>
  ({
    labels_nationaux: LabelsNationaux([
      LabelNational.CNFS,
      ...(structure?.estLabelliseAidantsConnect === 'OUI' ? [LabelNational.AidantsConnect] : []),
      ...(structure?.estLabelliseFranceServices === 'OUI' ? [LabelNational.FranceServices] : [])
    ])
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

const throwNoAidantsError = () => {
  throw new AidantsError();
};

const aidantsIfAny = aidants =>
  // Retire les aidants souhaitant être "anonyme"
  aidants?.filter(aidant => aidant.nonAffichageCarto !== true || (aidant.nonAffichageCarto !== true && aidant.statut !== 'TERMINE'))?.length > 0 ? {
    aidants:
    removeDuplicates(aidants.filter(aidant => aidant.nonAffichageCarto !== true || (aidant.nonAffichageCarto !== true && aidant.statut !== 'TERMINE')))
    .map(aidant => ({
      aidantId: aidant._id,
      ...formatNomAidant(aidant.prenom, aidant.nom),
      ...courrielIfAny(removeAllSpaces(aidant.emailPro)),
      ...telephoneIfAny(formatPhone(aidant.telephonePro))
    }))
    // eslint-disable-next-line no-nested-ternary
    .sort((aidant1, aidant2) => (aidant1.nom > aidant2.nom) ? 1 : ((aidant2.nom > aidant1.nom) ? -1 : 0))
  } : throwNoAidantsError();

const localisationIfAny = coordinates =>
  coordinates !== undefined ? {
    localisation: Localisation({
      latitude: coordinates[1],
      longitude: coordinates[0]
    })
  } : {};

const REQUIRED_FIELDS_ERRORS = [
  NomError,
  IdError,
  CommuneError,
  CodePostalError,
  VoieError,
  AidantsError
];

const noInvalidSiret = siret =>
  siret === '' ||
  siret === null ||
  siret.length !== 14 ?
    '00000000000000' :
    siret;

const formatCodePostal = codePostal => removeAllSpaces(codePostal)?.slice(0, 5);

const formatCommune = ville => removeSuperfluousSpaces(
  ville
  ?.replace('.', '')
  .replace(/\(.*\)/gu, '')
  .replace(/.*,/gu, '')
);

const lieuxDeMediationNumerique = async ({ getPermanences }) =>
  (await getPermanences()).map(permanence => {
    try {
      return {
        ...toSchemaLieuMediationNumerique({
          id: Id(permanence._id),
          pivot: Pivot(noInvalidSiret(removeAllSpaces(permanence.siret))),
          nom: Nom(removeSuperfluousSpaces(permanence.nomEnseigne)),
          adresse: Adresse({
            voie: removeSuperfluousSpaces(removeNullStrings([permanence.adresse?.numeroRue, permanence.adresse?.rue].join(' '))),
            code_postal: formatCodePostal(permanence.adresse?.codePostal),
            commune: formatCommune(permanence.adresse?.ville),
          }),
          ...localisationIfAny(permanence.location?.coordinates),
          contact: Contact({
            ...telephoneIfAny(formatPhone(permanence.numeroTelephone)),
            ...courrielIfAny(removeAllSpaces(permanence.email)),
            ...siteWebIfAny(formatUrl(permanence.siteWeb))
          }),
          ...horairesIfAny(toOsmOpeningHours(toTimeTable(permanence.horaires))),
          source: 'conseiller-numerique',
          date_maj: permanence.updatedAt,
          services: Services(CNFS_COMMON_SERVICES),
          conditions_acces: ConditionsAcces([ConditionAcces.Gratuit]),
          ...labelsNationaux(permanence.structure),
          ...priseRdvIfAny(formatUrl(permanence.structure?.urlPriseRdv))
        }),
        structureId: permanence.structure?._id,
        structureNom: permanence.structure?.nom,
        ...aidantsIfAny(permanence.aidants),
        ...isPrivate(permanence.typeAcces),
      };
    } catch (error) {
      if (REQUIRED_FIELDS_ERRORS.some(requiredFieldError => error instanceof requiredFieldError)) {
        return undefined;
      }

      throw error;
    }
  }).filter(keepDefined);

module.exports = {
  lieuxDeMediationNumerique,
  CNFS_COMMON_SERVICES
};
