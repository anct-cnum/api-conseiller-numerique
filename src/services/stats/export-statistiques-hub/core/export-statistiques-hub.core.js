const { findDepartementByRegion } = require('../utils/export-statistiques-hub.utils');

const formatAdresseStructure = insee => {

  let adresse = (insee?.etablissement?.adresse?.numero_voie ?? '') + ' ' +
  (insee?.etablissement?.adresse?.type_voie ?? '') + ' ' +
  (insee?.etablissement?.adresse?.nom_voie ?? '') + ' ' +
  (insee?.etablissement?.adresse?.complement_adresse ? insee.etablissement.adresse.complement_adresse + ' ' : ' ') +
  (insee?.etablissement?.adresse?.code_postal ?? '') + ' ' +
  (insee?.etablissement?.adresse?.localite ?? '');

  return adresse.replace(/["']/g, '');
};

const prettifyAndComplete = getStructureNameFromId => async statCnfs => {

  const { structureId, ...nextStatCnfs } = statCnfs;
  return {
    ...nextStatCnfs,
    nomStructure: structureId ? (await getStructureNameFromId(structureId)).nom : '',
    emailStructure: structureId ? (await getStructureNameFromId(structureId)).contact?.email : '',
    // eslint-disable-next-line max-len
    adresseStructure: structureId ? formatAdresseStructure((await getStructureNameFromId(structureId)).insee) : '',
    codeDepartement: structureId ? (await getStructureNameFromId(structureId)).codeDepartement : '',
  };
};

const getStatsCnfsHubs = async (hub, { getStatsCnfsHub, getStructureNameFromId }) => {
  let departements;
  if (hub.region_names) {
    departements = findDepartementByRegion(hub.region_names);
    console.log(departements);
  } else {
    departements = hub.departements;
  }

  return Promise.all(
    (await getStatsCnfsHub(departements)).map(prettifyAndComplete(getStructureNameFromId))
  );
};

module.exports = {
  getStatsCnfsHubs
};
