/**
 * On cherche le bon coselec avec avis POSITIF :
 * 1/ Ce n'est pas forcément le dernier de toute la liste. Car parfois structure repassée
 *    en coselec avec un avis EXAMEN COMPLEMENTAIRE par ex.
 * 2/ Il peut y en avoir plusieurs, car le nombre de conseillers a pu être revu
 *    à la hausse depuis la dernière validation.
 *    Dans ce cas on prend le dernier (le plus récent)
 */
const getCoselecPositif = structure => {
  let coselecsPositifs = null;
  if ('coselec' in structure && structure.coselec !== null) {
    coselecsPositifs = structure.coselec.filter(c => c.avisCoselec === 'POSITIF');
  }
  // On prend le dernier
  return (coselecsPositifs !== null && coselecsPositifs.length > 0) ? coselecsPositifs.slice(-1).pop() : null;
};

/**
 * On cherche le dernier Coselec en fonction du numéro.
 * Le numéro est de la forme "COSELEC 2"
 */
const getLastCoselec = structure => {
  let coselecs = null;
  if ('coselec' in structure && structure.coselec !== null) {
    coselecs = structure.coselec.sort((a, b) =>
      (a.numero !== null && b.numero !== null) ? ~~a.numero.replace('COSELEC ', '') - ~~b.numero.replace('COSELEC ', '') : -1);
  }
  return (coselecs !== null && coselecs.length > 0) ? coselecs.slice(-1).pop() : null;
};

/**
 * Si la structure a été validée, on récupère le bon coselec positif
 * Sinon, on récupère le dernier avis
 */
const getCoselec = structure => {
  if (structure.statut === 'VALIDATION_COSELEC') {
    return getCoselecPositif(structure);
  }
  return getLastCoselec(structure);
};

module.exports = { getCoselecPositif, getLastCoselec, getCoselec };
