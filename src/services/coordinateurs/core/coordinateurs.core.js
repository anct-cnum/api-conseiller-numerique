const { formatAddressFromInsee, formatAddressFromPermanence } = require('../../conseillers/common');

const formatTexte = texte => texte.toLowerCase().replace(/(^\w{1})|([\s,-]+\w{1})/g, letter => letter.toUpperCase());

// eslint-disable-next-line max-len
const COURRIEL_REGEXP = /^(?:(?:[^<>()[\]\\.,;:\s@"]+(?:\.[^<>()[\]\\.,;:\s@"]+)*)|(?:".+"))@(?:(?:\[\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}])|(?:(?:[A-Za-zÀ-ÖØ-öø-ÿ\-\d]+\.)+[a-zA-Z]{2,}))$/;
const courrielIfAny = courriel => courriel && COURRIEL_REGEXP.test(courriel) ? { courriel } : {};

const PHONE_REGEX = /^(?:(?:\+)(33|590|596|594|262|269))(?:\d{3}){3}$/;
const checkLengthPhone = telephone => PHONE_REGEX.test(telephone) || (telephone.startsWith('0') && telephone.length === 10);
const telephoneIfAny = telephone => telephone && checkLengthPhone(telephone) ? { telephone } : {};

const PERIMETRES_LIST = { 'conseillers': 'Bassin de vie', 'codeDepartement': 'Départemental', 'codeRegion': 'Régional' };
const formatPerimetre = type => PERIMETRES_LIST[type] ? { perimetre: PERIMETRES_LIST[type] } : {};

const getGeometryPositions = conseiller => {
  let longitude;
  let latitude;
  if (conseiller.permanence?.location?.coordinates) {
    longitude = conseiller.permanence.location.coordinates[0];
    latitude = conseiller.permanence.location.coordinates[1];
  } else if (conseiller.structure.coordonneesInsee?.coordinates) {
    longitude = conseiller.structure.coordonneesInsee?.coordinates[0];
    latitude = conseiller.structure.coordonneesInsee?.coordinates[1];
  } else {
    longitude = conseiller.structure.location?.coordinates[0];
    latitude = conseiller.structure.location?.coordinates[1];
  }

  return { latitude, longitude };
};

const getStats = async (getStatsCoordination, getIdStructures, subordonnes, coordinateurId) => {
  let query;
  switch (subordonnes.type) {
    case 'codeDepartement':
      query = { codeDepartementStructure: { $in: subordonnes.liste }, _id: { $ne: coordinateurId } };
      break;
    case 'codeRegion':
      query = { codeRegionStructure: { $in: subordonnes.liste }, _id: { $ne: coordinateurId } };
      break;
    case 'codeCommune':
      const listStructures = getIdStructures(subordonnes.liste);
      query = { structureId: { $in: listStructures }, _id: { $ne: coordinateurId } };
      break;
    default: //type conseillers
      query = { _id: { $in: subordonnes.liste } };
      break;
  }
  const stats = await getStatsCoordination(query);
  return {
    nombreDePersonnesCoordonnees: stats[0]?.nbConseillers ?? 0,
    nombreDeStructuresAvecDesPersonnesCoordonnees: stats[0]?.nbStructures?.length ?? 0
  };
};

const listeCoordinateurs = async ({ getCoordinateurs, getStatsCoordination, getIdStructures }) => {
  let coordinateurs = await getCoordinateurs();
  return await Promise.all(coordinateurs.map(async coordinateur => {
    return {
      id: coordinateur._id.toString(),
      prenom: formatTexte(coordinateur.prenom),
      nom: formatTexte(coordinateur.nom),
      commune: coordinateur.permanence?.adresse?.ville ?? coordinateur.structure.nomCommune,
      codePostal: coordinateur.permanence?.adresse?.codePostal ?? coordinateur.structure.codePostal,
      adresse:
        coordinateur.permanence?.adresse ?
          formatAddressFromPermanence(coordinateur.permanence?.adresse) :
          formatAddressFromInsee(coordinateur.structure?.insee?.adresse),
      ...courrielIfAny(coordinateur.emailPro),
      ...telephoneIfAny(coordinateur.telephonePro),
      ...formatPerimetre(coordinateur.listeSubordonnes.type),
      ...await getStats(getStatsCoordination, getIdStructures, coordinateur.listeSubordonnes, coordinateur._id),
      dispositif: 'CnFS',
      ...getGeometryPositions(coordinateur),
    };
  }));
};

const listePermanences = permanences => {
  const lieuActivitePrincipal = permanences.filter(permanence => permanence.estPrincipale === true)?.map(lieuPrincipal => {
    return {
      nom: lieuPrincipal.nomEnseigne,
      adresse: formatAddressFromPermanence(lieuPrincipal.adresse)
    };
  })[0] ?? {};
  const lieuActivite = permanences.filter(permanence => permanence.estPrincipale !== true)?.map(permanence => {
    return {
      id: permanence._id.toString(),
      nom: permanence.nomEnseigne,
      commune: permanence.adresse?.ville,
      codePostal: permanence.adresse?.codePostal,
    };
  }) ?? {};
  return {
    lieuActivitePrincipal,
    lieuActivite
  };
};

const coordinateursIfAny = coordinateurs => {
  if (coordinateurs) {
    return {
      coordinateurs: coordinateurs.map(coordinateur => {
        return {
          id: coordinateur.id.toString(),
          nom: coordinateur.nonAffichageCarto === true ? 'Anonyme' : formatTexte(coordinateur.prenom) + ' ' + formatTexte(coordinateur.nom),
        };
      })
    };
  }
  return {};
};

const listeConseillers = async ({ getConseillers, getPermanences }) => {
  let conseillers = await getConseillers();
  return await Promise.all(conseillers.map(async conseiller => {
    const permanences = await getPermanences(conseiller._id);
    return {
      id: conseiller._id.toString(),
      ...coordinateursIfAny(conseiller.coordinateurs),
      nom: formatTexte(conseiller.prenom) + ' ' + formatTexte(conseiller.nom),
      ...getGeometryPositions({ ...conseiller, permanence: permanences.filter(permanence => permanence.estPrincipale === true)[0] }),
      ...courrielIfAny(conseiller.emailPro),
      ...telephoneIfAny(conseiller.telephonePro),
      structurePorteuse: {
        nom: conseiller.structure.nom,
        adresse: formatAddressFromInsee(conseiller.structure.insee?.adresse),
      },
      ...listePermanences(permanences),
    };
  }));
};

module.exports = {
  listeCoordinateurs,
  listeConseillers,
};

