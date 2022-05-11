const Joi = require('joi');
const hubs = require('../../../../../data/imports/hubs.json');
const departements = require('../../../../../data/imports/departements-region.json');

const validateExportStatistiquesHubSchema = exportHubInput => Joi.object({
  hub: Joi.string().required().error(new Error('Le hub est invalide')),
}).validate(exportHubInput);

const findDepartementOrRegion = nomHub => {
  return hubs.find(hub => `${hub.name}` === nomHub);
};

const findNumDepartementByRegion = hubRegion => {
  return departements.filter(
    departement => departement.region_name === hubRegion[0]).map(departement => departement.num_dep);
};

const getExportStatistiquesHubFileName = hub => `Statistiques_${hub}`;

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
      statCnfs.nom,
      statCnfs.prenom,
      statCnfs?.emailCN?.address ?? 'compte COOP non créé',
      statCnfs.codeRegion,
      statCnfs.codePostal,
      statCnfs.nomStructure.replace(/["',]/g, ''),
      statCnfs.emailStructure,
      statCnfs.adresseStructure,
      statCnfs.codeDepartement,
    ].join(csvCellSeparator))
  ].join(csvLineSeparator);
};

module.exports = {
  validateExportStatistiquesHubSchema,
  findDepartementOrRegion,
  findNumDepartementByRegion,
  buildExportHubCnfsCsvFileContent,
  getExportStatistiquesHubFileName
};
