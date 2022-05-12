const Joi = require('joi');
const hubs = require('../../../../../data/imports/hubs.json');
const departements = require('../../../../../data/imports/departements-region.json');

const validateExportsHubSchema = exportHubInput => Joi.object({
  hub: Joi.string().required().error(new Error('Le hub est invalide')),
}).validate(exportHubInput);

const findDepartementOrRegion = nomHub => {
  return hubs.find(hub => `${hub.name}` === nomHub);
};

const findNumDepartementByRegion = hubRegion => {
  return departements.filter(
    departement => departement.region_name === hubRegion[0]).map(departement => departement.num_dep);
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

const getExportCnfsHubFileName = hub => `export-cnfs_${hub}`;

const csvCellSeparator = ';';
const csvLineSeparator = '\n';

const buildExportHubCnfsCsvFileContent = async statsCnfs => {
  let fileHeaders = [
    'Nom',
    'Prénom',
    'Email @conseiller-numerique.fr',
    'Code Region du conseiller',
    'Code Postal du conseiller',
    'Nom de la structure',
    'Email de la structure',
    'Adresse de la structure',
    'Code département de la structure',
  ];
  return [
    fileHeaders.join(csvCellSeparator),
    ...statsCnfs.map(statCnfs => [
      statCnfs.conseiller.nom,
      statCnfs.conseiller.prenom,
      statCnfs.conseiller?.emailCN?.address ?? 'compte COOP non créé',
      statCnfs.conseiller.codeRegion,
      statCnfs.conseiller.codePostal,
      statCnfs.nom.replace(/["',]/g, ''),
      statCnfs.contact?.email,
      formatAdresseStructure(statCnfs.insee),
      statCnfs.codeDepartement,
    ].join(csvCellSeparator))
  ].join(csvLineSeparator);
};

module.exports = {
  validateExportsHubSchema,
  findDepartementOrRegion,
  findNumDepartementByRegion,
  buildExportHubCnfsCsvFileContent,
  getExportCnfsHubFileName
};
