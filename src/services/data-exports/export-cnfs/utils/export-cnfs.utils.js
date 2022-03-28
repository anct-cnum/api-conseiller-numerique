const Joi = require('joi');
const dayjs = require('dayjs');

const validateExportCnfsSchema = exportTerritoiresInput => Joi.object({
  dateDebut: Joi.date().required().error(new Error('La date de début est invalide')),
  dateFin: Joi.date().required().error(new Error('La date de fin est invalide')),
  nomOrdre: Joi.string().error(new Error('Le nom de l\'ordre est invalide')),
  ordre: Joi.number().error(new Error('L\'ordre est invalide')),
  isUserActif: Joi.boolean().error(new Error('Le filtre actif est invalide')),
  certifie: Joi.boolean().error(new Error('Le filtre certifie est invalide')),
  groupeCRA: Joi.number().error(new Error('Le filtre groupe CRA est invalide'))
}).validate(exportTerritoiresInput);

const isUserActifIdDefined = isUserActif => isUserActif !== undefined ? { isUserActif } : {};

const certifieIfDefined = certifie => certifie !== undefined ? { certifie } : {};

const groupeCRAIfDefined = groupeCRA => groupeCRA !== undefined ? { groupeCRA } : {};

const orderingDefined = sort => {
  if (sort === undefined) {
    return {};
  }

  return {
    nomOrdre: Object.keys(sort)[0],
    ordre: Object.values(sort)[0],
  };
};

const exportCnfsQueryToSchema = query => {
  return {
    dateDebut: new Date(query.datePrisePoste.$gt),
    dateFin: new Date(query.datePrisePoste.$lt),
    ...orderingDefined(query.$sort),
    ...isUserActifIdDefined(query.isUserActif),
    ...certifieIfDefined(query.certifie),
    ...groupeCRAIfDefined(query.groupeCRA)
  };
};

const getExportCnfsFileName = (dateDebut, dateFin) =>
  `export-cnfs_entre_${dayjs(dateDebut).format('YYYY-MM-DD')}_et_${dayjs(dateFin).format('YYYY-MM-DD')}.csv`;

const csvCellSeparator = ';';
const csvLineSeparator = '\n';

const buildExportCnfsCsvFileContent = async (statsCnfs, user) => {
  let fileHeaders = [
    'Prénom',
    'Nom',
    'Email',
    'Email @conseiller-numerique.fr',
    'Structure',
    'Code Postal',
    'Date de recrutement',
    'Date de fin de formation',
    'GroupeCRA',
    'Certification',
    'Activé',
  ];
  if (user.roles.includes('admin_coop')) {
    fileHeaders[5] = 'Code Postal du conseiller';
    fileHeaders.push('CRA Saisis');
    fileHeaders.splice(5, 0, 'Code département de la structure');
    return [
      fileHeaders.join(csvCellSeparator),
      ...statsCnfs.map(statCnfs => [
        statCnfs.prenom,
        statCnfs.nom,
        statCnfs.email,
        statCnfs?.emailCN?.address ?? 'compte COOP non créé',
        statCnfs.nomStructure.replace(/["',]/g, ''),
        statCnfs.codeDepartement,
        statCnfs.codePostal,
        statCnfs.datePrisePoste,
        statCnfs.dateFinFormation,
        statCnfs?.groupeCRA,
        statCnfs.certifie,
        statCnfs.isUserActif,
        statCnfs.craCount
      ].join(csvCellSeparator))
    ].join(csvLineSeparator);
  }
  return [
    fileHeaders.join(csvCellSeparator),
    ...statsCnfs.map(statCnfs => [
      statCnfs.prenom,
      statCnfs.nom,
      statCnfs.email,
      statCnfs?.emailCN?.address ?? 'compte COOP non créé',
      statCnfs.nomStructure.replace(/["',]/g, ''),
      statCnfs.codePostal,
      statCnfs.datePrisePoste,
      statCnfs.dateFinFormation,
      statCnfs?.groupeCRA,
      statCnfs.certifie,
      statCnfs.isUserActif
    ].join(csvCellSeparator))
  ].join(csvLineSeparator);
};

module.exports = {
  validateExportCnfsSchema,
  exportCnfsQueryToSchema,
  getExportCnfsFileName,
  buildExportCnfsCsvFileContent
};
