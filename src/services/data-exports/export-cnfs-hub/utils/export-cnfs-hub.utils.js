const hubs = require('../../../../../data/imports/hubs.json');
const departements = require('../../../../../data/imports/departements-region.json');

const findDepartementOrRegion = nomHub => {
  return hubs.find(hub => `${hub.name}` === nomHub);
};

const findNumDepartementsByRegion = hubRegion => {
  return departements.filter(
    departement => hubRegion.includes(departement.region_name)).map(departement => departement.num_dep);
};

const formatAdresseStructure = insee => {

  let adresse = (insee?.etablissement?.adresse?.numero_voie ?? '') + ' ' +
  (insee?.etablissement?.adresse?.type_voie ?? '') + ' ' +
  (insee?.etablissement?.adresse?.nom_voie ?? '') + ' ' +
  (insee?.etablissement?.adresse?.complement_adresse ? insee.etablissement.adresse.complement_adresse + ' ' : ' ') +
  (insee?.etablissement?.adresse?.code_postal ?? '') + ' ' +
  (insee?.etablissement?.adresse?.localite ?? '');

  return adresse.replace(/["']/g, '');
};

const csvCellSeparator = ';';
const csvLineSeparator = '\n';

const buildExportHubCnfsCsvFileContent = async statsCnfs => {
  const fileHeaders = [
    'Nom',
    'Prénom',
    'Email @conseiller-numerique.fr',
    'Nom de la structure',
    'Email de la structure',
    'Adresse de la structure',
    'Code région de la structure',
  ];
  return [
    fileHeaders.join(csvCellSeparator),
    ...statsCnfs.map(statCnfs => [
      statCnfs.conseiller.nom,
      statCnfs.conseiller.prenom,
      statCnfs.conseiller?.mattermost?.id ? statCnfs.conseiller?.emailCN?.address : 'compte COOP non créé',
      statCnfs.nom.replace(/["',]/g, ''),
      statCnfs.contact?.email,
      formatAdresseStructure(statCnfs.insee),
      statCnfs.codeRegion
    ].join(csvCellSeparator))
  ].join(csvLineSeparator);
};

module.exports = {
  findDepartementOrRegion,
  findNumDepartementsByRegion,
  buildExportHubCnfsCsvFileContent,
};
