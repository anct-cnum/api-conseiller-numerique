const Joi = require('joi');
const dayjs = require('dayjs');

const validateExportCnfsSchema = exportTerritoiresInput => Joi.object({
  dateDebut: Joi.date().required().error(new Error('La date de début est invalide')),
  dateFin: Joi.date().required().error(new Error('La date de fin est invalide')),
  nomOrdre: Joi.string().error(new Error('Le nom de l\'ordre est invalide')),
  ordre: Joi.number().error(new Error('L\'ordre est invalide')),
  isUserActif: Joi.boolean().error(new Error('Le filtre actif est invalide')),
  certifie: Joi.boolean().error(new Error('Le filtre certifie est invalide')),
}).validate(exportTerritoiresInput);

const isUserActifIdDefined = isUserActif => isUserActif !== undefined ? { isUserActif } : {};

const certifieIfDefined = certifie => certifie !== undefined ? { certifie } : {};

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
  };
};

const getExportCnfsFileName = (dateDebut, dateFin) =>
  `export-cnfs_entre_${dayjs(dateDebut).format('YYYY-MM-DD')}_et_${dayjs(dateFin).format('YYYY-MM-DD')}.csv`;

const csvCellSeparator = ';';
const csvLineSeparator = '\n';
let fileHeaders = [
  'Prénom',
  'Nom',
  'Email',
  'Structure',
  'Code Postal',
  'Date de recrutement',
  'Date de fin de formation',
  'Certification',
  'Activé',
];


const buildExportCnfsCsvFileContent = async (statsCnfs, user) => {
  if (user.roles.includes('admin_coop')) {
    fileHeaders.push('CRA Saisis');
    return [
      fileHeaders.join(csvCellSeparator),
      ...statsCnfs.map(statCnfs => [
        statCnfs.prenom,
        statCnfs.nom,
        statCnfs.email,
        statCnfs.nomStructure,
        statCnfs.codePostal,
        statCnfs.datePrisePoste,
        statCnfs.dateFinFormation,
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
      statCnfs.nomStructure,
      statCnfs.codePostal,
      statCnfs.datePrisePoste,
      statCnfs.dateFinFormation,
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
