const Joi = require('joi');

const validateExportTerritoireSchema = exportTerritoiresInput => Joi.object({
  territoire: Joi.string().required().error(new Error('Le type de territoire est invalide')),
  dateDebut: Joi.date().required().error(new Error('La date de début est invalide')),
  dateFin: Joi.date().required().error(new Error('La date de fin est invalide')),
  nomOrdre: Joi.string().required().error(new Error('Le nom de l\'ordre est invalide')),
  ordre: Joi.number().required().error(new Error('L\'ordre est invalide')),
}).validate(exportTerritoiresInput);

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

const codeAndNomTerritoire = (territoire, statTerritoire) => {
  if (territoire === 'codeRegion') {
    return [
      statTerritoire.codeRegion,
      statTerritoire.nomRegion
    ];
  } else if (territoire === 'codeDepartement') {
    return [
      statTerritoire.codeDepartement,
      statTerritoire.nomDepartement
    ];
  }
};

const buildExportTerritoiresCsvFileContent = (statsTerritoires, territoire) => [
  fileHeaders.join(csvCellSeparator),
  ...statsTerritoires.map(statTerritoire => [
    ...codeAndNomTerritoire(territoire, statTerritoire),
    statTerritoire.personnesAccompagnees,
    statTerritoire.nombreConseillersCoselec,
    statTerritoire.cnfsActives,
    statTerritoire.cnfsInactives,
    statTerritoire.tauxActivation
  ].join(csvCellSeparator))
].join(csvLineSeparator);


module.exports = {
  validateExportTerritoireSchema,
  buildExportTerritoiresCsvFileContent
};
