const Joi = require('joi');
const dayjs = require('dayjs');

const exportStatistiquesQueryToSchema = query => {
  return {
    dateDebut: new Date(query.dateDebut),
    dateFin: new Date(query.dateFin),
    codePostal: query.codePostal === 'null' ? '' : query.codePostal,
    ville: query.ville === 'null' ? '' : query.ville,
    codeCommune: query.codeCommune === 'null' ? '' : query.codeCommune,
  };
};

const validateExportStatistiquesSchema = exportTerritoiresInput => Joi.object({
  dateDebut: Joi.date().required().error(new Error('La date de début est invalide')),
  dateFin: Joi.date().required().error(new Error('La date de fin est invalide')),
  codePostal: Joi.required().error(new Error('Le code postal est invalide')),
  ville: Joi.required().error(new Error('La ville est invalide')),
}).validate(exportTerritoiresInput);

const formatDate = (date, separator = '/') => dayjs(new Date(date)).format(`DD${separator}MM${separator}YYYY`);

const getExportStatistiquesFileName = (dateDebut, dateFin) =>
  `Mes_statistiques_${formatDate(dateDebut, '-')}_${formatDate(dateFin, '-')}`;

module.exports = {
  validateExportStatistiquesSchema,
  exportStatistiquesQueryToSchema,
  getExportStatistiquesFileName
};
