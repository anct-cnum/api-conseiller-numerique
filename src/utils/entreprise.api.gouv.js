const axios = require('axios');

const getUrlEntrepriseApiV3 = (sirenOuSiret, type) => {
  let params = '?context=cnum&object=checkSiret&recipient=13002603200016';
  let url = 'https://entreprise.api.gouv.fr/v3/';
  let service = '';
  switch (type) {
    case 'siret':
      service = 'insee/sirene/etablissements/' + sirenOuSiret;
      break;
    case 'siren':
      service = 'insee/sirene/unites_legales/' + sirenOuSiret + '/siege_social/';
      break;
    default:
      break;
  }
  return url + service + params;
};

const getEntrepriseBySirenEntrepriseApiV3 = async (siren, token) => {
  const result = await axios.get(getUrlEntrepriseApiV3(siren, 'siren'), { headers: { 'Authorization': 'Bearer ' + token } });
  return result.data.data;
};

const getEtablissementBySiretEntrepriseApiV3 = async (siret, token) => {
  const result = await axios.get(getUrlEntrepriseApiV3(siret, 'siret'), { headers: { 'Authorization': 'Bearer ' + token } });
  return result.data.data;
};

const getAdresseEtablissementBySiretEntrepriseApiV3 = async (siret, token) => {
  const result = await axios.get(getUrlEntrepriseApiV3(siret, 'siret'), { headers: { 'Authorization': 'Bearer ' + token } });
  return result.data.data.adresse;
};

const getRaisonSocialeBySiretEntrepriseApiV3 = async (siret, token) => {
  const result = await axios.get(getUrlEntrepriseApiV3(siret, 'siret'), { headers: { 'Authorization': 'Bearer ' + token } });
  return result.data.data.unite_legale.personne_morale_attributs.raison_sociale;
};

module.exports = {
  getEntrepriseBySirenEntrepriseApiV3,
  getEtablissementBySiretEntrepriseApiV3,
  getAdresseEtablissementBySiretEntrepriseApiV3,
  getRaisonSocialeBySiretEntrepriseApiV3
};
