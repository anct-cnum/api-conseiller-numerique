const { ValidationError } = require('joi');
const { validatePlaceSchema } = require('./geocode-place.utils');

describe('utilitaire pour la géolocalisation d\'un lieu', () => {
  describe('validation du lieu à géolocaliser', () => {
    it('devrait être en erreur lorsque la donnée d\'entrée est vide', () => {
      const schemaValidation = validatePlaceSchema({});

      expect(schemaValidation).toEqual({
        error: new Error('Le lieu à géolocaliser est invalide'),
        value: {},
      });
    });

    it('devrait être en erreur lorsque la donnée d\'entrée contient un champ non admis', () => {
      const schemaValidation = validatePlaceSchema({
        place: '69001',
        test: 'error'
      });

      expect(schemaValidation).toEqual({
        error: new ValidationError('"test" is not allowed'),
        value: {
          place: '69001',
          test: 'error'
        }
      });
    });

    it('devrait être en succès lorsque la donnée d\'entrée est valide', () => {
      const schemaValidation = validatePlaceSchema({
        place: '69001',
      });

      expect(schemaValidation).toEqual({
        value: {
          place: '69001',
        }
      });
    });
  });
});
