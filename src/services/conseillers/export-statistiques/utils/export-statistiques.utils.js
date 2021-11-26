const Joi = require('joi');
const dayjs = require('dayjs');

const exportStatistiquesQueryToSchema = query => {
  return {
    dateDebut: new Date(query.dateDebut),
    dateFin: new Date(query.dateFin)
  };
};

const validateExportStatistiquesSchema = exportTerritoiresInput => Joi.object({
  dateDebut: Joi.date().required().error(new Error('La date de début est invalide')),
  dateFin: Joi.date().required().error(new Error('La date de fin est invalide'))
}).validate(exportTerritoiresInput);

const formatDate = (date, separator = '/') => dayjs(new Date(date)).format(`DD${separator}MM${separator}YYYY`);

const getExportStatistiquesFileName = (dateDebut, dateFin) =>
  `Mes_statistiques_${formatDate(dateDebut, '-')}_${formatDate(dateFin, '-')}`;

module.exports = {
  validateExportStatistiquesSchema,
  exportStatistiquesQueryToSchema,
  getExportStatistiquesFileName
};