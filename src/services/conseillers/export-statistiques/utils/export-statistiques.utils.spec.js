const { ValidationError } = require('joi');
const {
  validateExportStatistiquesSchema,
  exportStatistiquesQueryToSchema,
  getExportStatistiquesFileName
} = require('./export-statistiques.utils');

describe('utilitaire pour l\'export des statistiques d\'accompagnement depuis l\'espace coop', () => {
  describe('projection du modèle de requête vers le modèle de schema', () => {
    it('devrait transformer les données de la requête dans le format attendu quand le idType est défini', () => {
      const query = {
        dateDebut: 'Fri Jan 01 2021 00:00:00 GMT 0100 (Central European Standard Time)',
        dateFin: 'Thu Nov 18 2021 11:00:00 GMT 0100 (Central European Standard Time)'
      };

      const schemaModel = exportStatistiquesQueryToSchema(query);

      expect(schemaModel).toStrictEqual({
        dateDebut: new Date('2021-01-01T00:00:00.000Z'),
        dateFin: new Date('2021-11-18T11:00:00.000Z')
      });
    });
  });

  describe('validation du schéma de données', () => {
    it('devrait être en erreur lorsque la donnée d\'entrée est vide', () => {
      const schemaValidation = validateExportStatistiquesSchema({});

      expect(schemaValidation).toEqual({
        error: new Error('La date de début est invalide'),
        value: {},
      });
    });

    it('devrait être en erreur lorsque la donnée d\'entrée contient un champ non admis', () => {
      const schemaValidation = validateExportStatistiquesSchema({
        dateDebut: new Date('2021-11-01T00:00:00.000Z'),
        dateFin: new Date('2021-12-31T11:00:00.000Z'),
        test: 'error'
      });

      expect(schemaValidation).toEqual({
        error: new ValidationError('"test" is not allowed'),
        value: {
          dateDebut: new Date('2021-11-01T00:00:00.000Z'),
          dateFin: new Date('2021-12-31T11:00:00.000Z'),
          test: 'error'
        }
      });
    });

    it('devrait être en succès lorsque la donnée d\'entrée est valide', () => {
      const schemaValidation = validateExportStatistiquesSchema({
        dateDebut: new Date('2021-11-01T00:00:00.000Z'),
        dateFin: new Date('2021-12-31T11:00:00.000Z'),
      });

      expect(schemaValidation).toEqual({
        value: {
          dateDebut: new Date('2021-11-01T00:00:00.000Z'),
          dateFin: new Date('2021-12-31T11:00:00.000Z'),
        },
      });
    });
  });

  describe('nom du fichier CSV d\'export des statistiques', () => {
    it('devrait contenir le nom complet du CNFS et les dates correspondant aux filtres', () => {
      const dateDebut = new Date('2021-01-01T00:00:00.000Z');
      const dateFin = new Date('2021-11-18T00:00:00.000Z');

      const fileName = getExportStatistiquesFileName(dateDebut, dateFin);

      expect(fileName).toBe('Mes_statistiques_01-01-2021_18-11-2021');
    });
  });
});
