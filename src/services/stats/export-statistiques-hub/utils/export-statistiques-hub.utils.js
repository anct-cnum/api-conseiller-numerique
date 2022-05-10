const Joi = require('joi');
const hubs = require('../../../../../data/imports/hubs.json');
const departements = require('../../../../../data/imports/departements-region.json');

const validateExportStatistiquesHubSchema = exportHubInput => Joi.object({
  hub: Joi.string().required().error(new Error('Le hub est invalide')),
}).validate(exportHubInput);

const findDepartementOuRegion = nomHub => {
  return hubs.find(hub => `${hub.name}` === nomHub);
};

const findDepartementByRegion = hubRegion => {
  return departements.filter(
    departement => departement.region_name === hubRegion[0]).map(departement => departement.num_dep);
};

// const getExportCnfsFileName = (dateDebut, dateFin) =>
//   `export-cnfs_entre_${dayjs(dateDebut).format('YYYY-MM-DD')}_et_${dayjs(dateFin).format('YYYY-MM-DD')}.csv`;

const csvCellSeparator = ';';
const csvLineSeparator = '\n';

const buildExportHubCnfsCsvFileContent = async statsCnfs => {
  let fileHeaders = [
    'Prénom',
    'Nom',
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
      statCnfs.prenom,
      statCnfs.nom,
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
  findDepartementOuRegion,
  findDepartementByRegion,
  buildExportHubCnfsCsvFileContent
};
