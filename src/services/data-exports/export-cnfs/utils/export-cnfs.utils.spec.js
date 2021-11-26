const { buildExportCnfsCsvFileContent, exportCnfsQueryToSchema, getExportCnfsFileName } = require('./export-cnfs.utils');
const { validateExportCnfsSchema } = require('./export-cnfs.utils');
const { ValidationError } = require('joi');

const statsCnfs = [
  {
    prenom: 'John',
    nom: 'Doe',
    email: 'john.doe@conseiller-numerique.fr',
    nomStructure: 'Association pour l\'accès au numérique',
    codePostal: 69005,
    datePrisePoste: '27/01/2021',
    dateFinFormation: '12/03/2021',
    certifie: 'Non',
    isUserActif: 'Non'
  }
];

describe('export cnfs utils', () => {
  it('should get error when an empty input is provided to export cnfs schema', () => {
    const schemaValidation = validateExportCnfsSchema({});

    expect(schemaValidation).toEqual({
      error: new Error('La date de début est invalide'),
      value: {},
    });
  });

  it('should get error when an invalid input is provided to export cnfs schema', () => {
    const schemaValidation = validateExportCnfsSchema({
      dateDebut: new Date(2021, 11, 1),
      dateFin: new Date(2021, 12, 31),
      nomOrdre: 'prenom',
      ordre: '1',
      test: 'error'
    });

    expect(schemaValidation).toEqual({
      error: new ValidationError('"test" is not allowed'),
      value: {
        dateDebut: new Date(2021, 11, 1),
        dateFin: new Date(2021, 12, 31),
        nomOrdre: 'prenom',
        ordre: 1,
        test: 'error'
      }
    });
  });

  it('should not get an error when a valid input is provided to export cnfs schema', () => {
    const schemaValidation = validateExportCnfsSchema({
      dateDebut: new Date(2021, 11, 1),
      dateFin: new Date(2021, 12, 31),
      nomOrdre: 'prenom',
      ordre: '1'
    });

    expect(schemaValidation).toEqual({
      value: {
        dateDebut: new Date(2021, 11, 1),
        dateFin: new Date(2021, 12, 31),
        nomOrdre: 'prenom',
        ordre: 1
      },
    });
  });

  it('should not get an error when optional isUserActif is provided to export cnfs schema', () => {
    const schemaValidation = validateExportCnfsSchema({
      dateDebut: new Date(2021, 11, 1),
      dateFin: new Date(2021, 12, 31),
      nomOrdre: 'prenom',
      ordre: '1',
      isUserActif: 'true'
    });

    expect(schemaValidation).toEqual({
      value: {
        dateDebut: new Date(2021, 11, 1),
        dateFin: new Date(2021, 12, 31),
        nomOrdre: 'prenom',
        ordre: 1,
        isUserActif: true
      },
    });
  });

  it('should not get an error when optional certifie is provided to export cnfs schema', () => {
    const schemaValidation = validateExportCnfsSchema({
      dateDebut: new Date(2021, 11, 1),
      dateFin: new Date(2021, 12, 31),
      nomOrdre: 'prenom',
      ordre: 1,
      certifie: 'true'
    });

    expect(schemaValidation).toEqual({
      value: {
        dateDebut: new Date(2021, 11, 1),
        dateFin: new Date(2021, 12, 31),
        nomOrdre: 'prenom',
        ordre: 1,
        certifie: true
      },
    });
  });

  it('should map from query model to schema model', () => {
    const query = {
      statut: 'RECRUTE',
      datePrisePoste: {
        $gt: '2020-11-17T00:00:00.000Z',
        $lt: '2021-11-07T20:01:05.742Z'
      },
      $sort: { prenom: '1' }
    };

    const schemaModel = exportCnfsQueryToSchema(query);

    expect(schemaModel).toStrictEqual({
      dateDebut: new Date('2020-11-17T00:00:00.000Z'),
      dateFin: new Date('2021-11-07T20:01:05.742Z'),
      nomOrdre: 'prenom',
      ordre: '1'
    });
  });

  it('should map from query model to schema model without optional sort', () => {
    const query = {
      statut: 'RECRUTE',
      datePrisePoste: {
        $gt: '2020-11-17T00:00:00.000Z',
        $lt: '2021-11-07T20:01:05.742Z'
      },
      isUserActif: 'true'
    };

    const schemaModel = exportCnfsQueryToSchema(query);

    expect(schemaModel).toStrictEqual({
      dateDebut: new Date('2020-11-17T00:00:00.000Z'),
      dateFin: new Date('2021-11-07T20:01:05.742Z'),
      isUserActif: 'true'
    });
  });

  it('should map from query model to schema model with optional isUserActif', () => {
    const query = {
      statut: 'RECRUTE',
      datePrisePoste: {
        $gt: '2020-11-17T00:00:00.000Z',
        $lt: '2021-11-07T20:01:05.742Z'
      },
      $sort: { prenom: '1' },
      isUserActif: 'true'
    };

    const schemaModel = exportCnfsQueryToSchema(query);

    expect(schemaModel).toStrictEqual({
      dateDebut: new Date('2020-11-17T00:00:00.000Z'),
      dateFin: new Date('2021-11-07T20:01:05.742Z'),
      nomOrdre: 'prenom',
      ordre: '1',
      isUserActif: 'true'
    });
  });

  it('should map from query model to schema model with optional certifie', () => {
    const query = {
      statut: 'RECRUTE',
      datePrisePoste: {
        $gt: '2020-11-17T00:00:00.000Z',
        $lt: '2021-11-07T20:01:05.742Z'
      },
      $sort: { prenom: '1' },
      certifie: 'true'
    };

    const schemaModel = exportCnfsQueryToSchema(query);

    expect(schemaModel).toStrictEqual({
      dateDebut: new Date('2020-11-17T00:00:00.000Z'),
      dateFin: new Date('2021-11-07T20:01:05.742Z'),
      nomOrdre: 'prenom',
      ordre: '1',
      certifie: 'true'
    });
  });

  it('should get export territoires file name', () => {
    const dateDebut = 'Mon Nov 02 2020 01:00:00 GMT 0100 (Central European Standard Time)';
    const dateFin = 'Tue Nov 17 2020 01:00:00 GMT 0100 (Central European Standard Time)';

    const fileName = getExportCnfsFileName(dateDebut, dateFin);

    expect(fileName).toEqual('export-cnfs_entre_2020-11-02_et_2020-11-17.csv');
  });

  it('should build territoires csv file content for cnfs', () => {
    const fileContent = buildExportCnfsCsvFileContent(statsCnfs);

    expect(fileContent).toEqual(
      'Prénom;Nom;Email;Structure;Code Postal;Date de recrutement;Date de fin de formation;Certification;Activé\n' +
      'John;Doe;john.doe@conseiller-numerique.fr;Association pour l\'accès au numérique;69005;27/01/2021;12/03/2021;Non;Non'
    );
  });
});
