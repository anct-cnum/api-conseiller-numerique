const Joi = require('joi');

const validateExportTerritoireSchema = exportTerritoiresInput => Joi.object({
  territoire: Joi.string().required().error(new Error('Le type de territoire est invalide')),
  dateDebut: Joi.date().required().error(new Error('La date de début est invalide')),
  dateFin: Joi.date().required().error(new Error('La date de fin est invalide')),
  nomOrdre: Joi.string().required().error(new Error('Le nom de l\'ordre est invalide')),
  ordre: Joi.number().required().error(new Error('L\'ordre est invalide')),
}).validate(exportTerritoiresInput);

const buildExportTerritoiresCsvFileContent = (statsTerritoires, territoire) => {
  const csvCellSeparator = ';';
  const csvLineSeparator = '\n';

  const fileHeaders = [
    'Code',
    'Nom',
    'Personnes accompagnées',
    'Dotation de conseillers',
    'CnFS activé sur l\'espace coop',
    'CnFS en attente d\'activation',
    'Taux d\'activation'
  ];

  return [
    fileHeaders.join(csvCellSeparator),
    ...statsTerritoires.map(statTerritoire => [
      (territoire === 'codeRegion' ? statTerritoire.codeRegion : statTerritoire.codeDepartement),
      (territoire === 'codeRegion' ? statTerritoire.nomRegion : statTerritoire.nomDepartement),
      statTerritoire.personnesAccompagnees,
      statTerritoire.nombreConseillersCoselec,
      statTerritoire.cnfsActives,
      statTerritoire.cnfsInactives,
      statTerritoire.tauxActivation
    ].join(csvCellSeparator))
  ].join(csvLineSeparator);
};

module.exports = {
  validateExportTerritoireSchema,
  buildExportTerritoiresCsvFileContent
};
