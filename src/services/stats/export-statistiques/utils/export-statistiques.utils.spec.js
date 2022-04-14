const { ValidationError } = require('joi');
const {
  validateExportStatistiquesSchema,
  exportStatistiquesQueryToSchema,
  getExportStatistiquesFileName,
  sortByValueThenName
} = require('./export-statistiques.utils');

describe('utilitaire pour l\'export des statistiques d\'accompagnement depuis le backoffice coop', () => {
  describe('projection du modèle de requête vers le modèle de schema', () => {
    it('devrait transformer les données de la requête dans le format attendu quand le idType est défini', () => {
      const query = {
        dateDebut: 'Fri Jan 01 2021 00:00:00 GMT 0100 (Central European Standard Time)',
        dateFin: 'Thu Nov 18 2021 11:00:00 GMT 0100 (Central European Standard Time)',
        type: 'user',
        codePostal: '',
        idType: '4a9bc1489ac8ba4c891b9a1c'
      };

      const schemaModel = exportStatistiquesQueryToSchema(query);

      expect(schemaModel).toStrictEqual({
        dateDebut: new Date('2021-01-01T00:00:00.000Z'),
        dateFin: new Date('2021-11-18T11:00:00.000Z'),
        type: 'user',
        codePostal: '',
        idType: '4a9bc1489ac8ba4c891b9a1c',
        conseillerIds: undefined,
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
        type: 'user',
        idType: '4a9bc1489ac8ba4c891b9a1c',
        codePostal: '',
        test: 'error'
      });

      expect(schemaValidation).toEqual({
        error: new ValidationError('"test" is not allowed'),
        value: {
          dateDebut: new Date('2021-11-01T00:00:00.000Z'),
          dateFin: new Date('2021-12-31T11:00:00.000Z'),
          type: 'user',
          idType: '4a9bc1489ac8ba4c891b9a1c',
          codePostal: '',
          test: 'error'
        }
      });
    });

    it('devrait être en succès lorsque la donnée d\'entrée est valide avec id type', () => {
      const schemaValidation = validateExportStatistiquesSchema({
        dateDebut: new Date('2021-11-01T00:00:00.000Z'),
        dateFin: new Date('2021-12-31T11:00:00.000Z'),
        type: 'user',
        idType: '4a9bc1489ac8ba4c891b9a1c',
      });

      expect(schemaValidation).toEqual({
        value: {
          dateDebut: new Date('2021-11-01T00:00:00.000Z'),
          dateFin: new Date('2021-12-31T11:00:00.000Z'),
          type: 'user',
          idType: '4a9bc1489ac8ba4c891b9a1c',
        },
      });
    });

    it('devrait être en succès lorsque la donnée d\'entrée est valide sans id type', () => {
      const schemaValidation = validateExportStatistiquesSchema({
        dateDebut: new Date('2021-11-01T00:00:00.000Z'),
        dateFin: new Date('2021-12-31T11:00:00.000Z'),
        type: 'user'
      });

      expect(schemaValidation).toStrictEqual({
        value: {
          dateDebut: new Date('2021-11-01T00:00:00.000Z'),
          dateFin: new Date('2021-12-31T11:00:00.000Z'),
          type: 'user'
        },
      });
    });
  });

  describe('nom du fichier CSV d\'export des statistiques', () => {
    it('devrait contenir le nom complet du CNFS et les dates correspondant aux filtres', () => {
      const dateDebut = new Date('2021-01-01T00:00:00.000Z');
      const dateFin = new Date('2021-11-18T00:00:00.000Z');

      const fileName = getExportStatistiquesFileName(dateDebut, dateFin, 'John_Doe');

      expect(fileName).toBe('Statistiques_John_Doe_01-01-2021_18-11-2021');
    });
  });

  describe('Ordre d\'affichage des themes', () => {

    it('devrait retourner les thèmes par ordre décroissant selon la valeur', () => {

      const themes = [
        {
          'nom': 'echanger',
          'valeur': 0
        },
        {
          'nom': 'demarche en ligne',
          'valeur': 4
        },
        {
          'nom': 'securite',
          'valeur': 1
        },
        {
          'nom': 'fraude et harcelement',
          'valeur': 8
        },
        {
          'nom': 'sante',
          'valeur': 3
        }
      ];

      const expectedResult = [
        {
          'nom': 'fraude et harcelement',
          'valeur': 8
        },
        {
          'nom': 'demarche en ligne',
          'valeur': 4
        },
        {
          'nom': 'sante',
          'valeur': 3
        },
        {
          'nom': 'securite',
          'valeur': 1
        },
        {
          'nom': 'echanger',
          'valeur': 0
        }
      ];

      const result = themes.sort(sortByValueThenName);

      expect(result).toStrictEqual(expectedResult);
    });

    it('devrait retourner les thèmes par ordre décroissant selon le libellé associé au nom si la valeur est identique', () => {

      const themes = [
        {
          'nom': 'equipement informatique',
          'valeur': 4
        },
        {
          'nom': 'internet',
          'valeur': 4
        },
        {
          'nom': 'trouver emploi',
          'valeur': 4
        },
        {
          'nom': 'accompagner enfant',
          'valeur': 4
        },
        {
          'nom': 'demarche en ligne',
          'valeur': 4
        }
      ];

      const expectedResult = [
        {
          'nom': 'accompagner enfant', //Correpondance : Accompagner son enfant
          'valeur': 4
        },
        {
          'nom': 'demarche en ligne', //Correpondance : Démarche en ligne
          'valeur': 4
        },
        {
          'nom': 'trouver emploi', //Correpondance : Emploi, formation
          'valeur': 4
        },
        {
          'nom': 'internet', //Correpondance : Naviguer sur Internet
          'valeur': 4
        },
        {
          'nom': 'equipement informatique', //Correpondance : Prendre en main un équipement
          'valeur': 4
        },
      ];

      const result = themes.sort(sortByValueThenName);

      expect(result).toStrictEqual(expectedResult);
    });
  });
});
