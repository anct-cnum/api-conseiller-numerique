const { validateExportTerritoireSchema, buildExportTerritoiresCsvFileContent } = require('./export-territoires.utils');
const { ValidationError } = require('joi');

describe('export territoires utils', () => {
  const statsTerritoires = [
    {
      _id: '1a37f502a1a690e76e3bf6bc',
      date: '01/11/2021',
      nombreConseillersCoselec: 12,
      cnfsActives: 0,
      cnfsInactives: 12,
      conseillerIds: [],
      codeDepartement: '01',
      codeRegion: '84',
      nomDepartement: 'Ain',
      nomRegion: 'Auvergne-Rhône-Alpes',
      tauxActivation: 0,
      personnesAccompagnees: 0
    },
    {
      _id: '8e46ccc42af27f4bb420f674',
      date: '01/11/2021',
      nombreConseillersCoselec: 22,
      cnfsActives: 0,
      cnfsInactives: 22,
      conseillerIds: [
        '5954ad7f14967a06f358f590',
        '13922f7748422a5480bbce54'
      ],
      codeDepartement: '02',
      codeRegion: '32',
      nomDepartement: 'Aisne',
      nomRegion: 'Hauts-de-France',
      tauxActivation: 0,
      personnesAccompagnees: 0
    }
  ];

  it('should get error when an empty input is provided to export territoire schema', () => {
    const schemaValidation = validateExportTerritoireSchema({});

    expect(schemaValidation).toEqual({
      error: new Error('Le type de territoire est invalide'),
      value: {},
    });
  });

  it('should get error when an invalid input is provided to export territoire schema', () => {
    const schemaValidation = validateExportTerritoireSchema({
      territoire: 'codeDepartement',
      dateDebut: new Date(2021, 11, 1),
      dateFin: new Date(2021, 12, 31),
      nomOrdre: 'codeCodeDepartement',
      ordre: 1,
      test: 'error'
    });

    expect(schemaValidation).toEqual({
      error: new ValidationError('"test" is not allowed'),
      value: {
        dateDebut: new Date(2021, 11, 1),
        dateFin: new Date(2021, 12, 31),
        nomOrdre: 'codeCodeDepartement',
        ordre: 1,
        territoire: 'codeDepartement',
        test: 'error'
      }
    });
  });

  it('should not get an error when a valid input is provided to export territoire schema', () => {
    const schemaValidation = validateExportTerritoireSchema({
      territoire: 'codeDepartement',
      dateDebut: new Date(2021, 11, 1),
      dateFin: new Date(2021, 12, 31),
      nomOrdre: 'codeCodeDepartement',
      ordre: 1
    });

    expect(schemaValidation).toEqual({
      value: {
        territoire: 'codeDepartement',
        dateDebut: new Date(2021, 11, 1),
        dateFin: new Date(2021, 12, 31),
        nomOrdre: 'codeCodeDepartement',
        ordre: 1
      },
    });
  });

  it('should build territoires csv file content for territoire with codeRegion value', () => {
    const territoire = 'codeRegion';

    const fileContent = buildExportTerritoiresCsvFileContent(statsTerritoires, territoire);

    expect(fileContent).toEqual(
      'Code;Nom;Personnes accompagnées;Dotation de conseillers;CnFS activé sur l\'espace coop;CnFS en attente d\'activation;Taux d\'activation\n' +
      '84;Auvergne-Rhône-Alpes;0;12;0;12;0\n' +
      '32;Hauts-de-France;0;22;0;22;0');
  });

  it('should build territoires csv file content for territoire with codeDepartement value', () => {
    const territoire = 'codeDepartement';


    const fileContent = buildExportTerritoiresCsvFileContent(statsTerritoires, territoire);

    expect(fileContent).toEqual(
      'Code;Nom;Personnes accompagnées;Dotation de conseillers;CnFS activé sur l\'espace coop;CnFS en attente d\'activation;Taux d\'activation\n' +
      '01;Ain;0;12;0;12;0\n' +
      '02;Aisne;0;22;0;22;0');
  });
});
