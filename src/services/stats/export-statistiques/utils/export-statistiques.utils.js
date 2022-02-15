const Joi = require('joi');
const dayjs = require('dayjs');

const exportStatistiquesQueryToSchema = query => {
  return {
    dateDebut: new Date(query.dateDebut),
    dateFin: new Date(query.dateFin),
    type: query.type,
    idType: query.idType === 'undefined' ? undefined : query.idType,
    conseillerIds: query.conseillerIds === 'undefined' ? undefined : query.conseillerIds,
    conseillerId: query.conseillerId
  };
};

const validateExportStatistiquesSchema = exportTerritoiresInput => Joi.object({
  dateDebut: Joi.date().required().error(new Error('La date de début est invalide')),
  dateFin: Joi.date().required().error(new Error('La date de fin est invalide')),
  type: Joi.string().required().error(new Error('Le type de territoire est invalide')),
  idType: Joi.string().error(new Error('L\'id du territoire invalide')),
  conseillerIds: Joi.string().error(new Error('Les ids des conseillers sont invalide')),
  conseillerId: Joi.string().error(new Error('L\' id du conseiller est invalide')),
}).validate(exportTerritoiresInput);

const formatDate = (date, separator = '/') => dayjs(new Date(date)).format(`DD${separator}MM${separator}YYYY`);

const getExportStatistiquesFileName = (dateDebut, dateFin, type, idType) =>
  `Statistiques_${type}${idType !== undefined ? `_${idType}` : ''}_${formatDate(dateDebut, '-')}_${formatDate(dateFin, '-')}`;

module.exports = {
  validateExportStatistiquesSchema,
  exportStatistiquesQueryToSchema,
  getExportStatistiquesFileName
};
