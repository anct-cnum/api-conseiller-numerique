const { buildExportCnfsCsvFileContent, exportCnfsQueryToSchema, getExportCnfsFileName } = require('./export-cnfs.utils');
const { validateExportCnfsSchema } = require('./export-cnfs.utils');
const { valueHistoryCra } = require('../core/export-cnfs.core');
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
    craCount: 12,
    isUserActif: 'Non',
    structure: {
      nom: 'Association pour l\'accès au numérique',
    },
  }
];

let statsCnfsForAdminCoop = [
  {
    idPG: 50,
    prenom: 'John',
    nom: 'Doe',
    email: 'john.doe@conseiller-numerique.fr',
    structure: {
      idPG: 1234,
      codeDepartement: '69000',
      contact: {
        email: 'test@mail.fr',
      },
      nom: 'Association pour l\'accès au numérique',
    },
    adresseStructure: '12 avenue du pont',
    codePostal: 69005,
    datePrisePoste: '27/01/2021',
    dateFinFormation: '12/03/2021',
    certifie: 'Non',
    craCount: 12,
    isUserActif: 'Non',
    groupeCRA: 0,
    groupeCRAHistorique: [
      {
        numero: 0,
        dateDeChangement: new Date('2022-04-25T09:35:15.699Z')
      },
      {
        numero: 1,
        dateDeChangement: new Date('2022-04-25T09:35:15.699Z')
      }
    ],
    countPersonnesAccompagnees: 10
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

  it('should build territoires csv file content for cnfs when user has no admin_coop role', async () => {
    const user = { roles: [] };
    const fileContent = await buildExportCnfsCsvFileContent(statsCnfs, user);

    expect(fileContent).toEqual(
      // eslint-disable-next-line max-len
      'Prénom;Nom;Email;Email @conseiller-numerique.fr;Nom de la structure;Code Postal;Date de recrutement;Date de fin de formation;Certification;Activé;CRA Saisis\n' +
      'John;Doe;john.doe@conseiller-numerique.fr;compte COOP non créé;Association pour laccès au numérique;69005;27/01/2021;12/03/2021;Non;Non;12'
    );
  });

  it('should build territoires csv file content for cnfs when user admin_coop role', async () => {
    const user = { roles: ['admin_coop'] };
    statsCnfsForAdminCoop[0].groupeCRAHistorique = await valueHistoryCra(statsCnfsForAdminCoop[0].groupeCRAHistorique);
    const fileContent = await buildExportCnfsCsvFileContent(statsCnfsForAdminCoop, user);

    expect(fileContent).toEqual(
      // eslint-disable-next-line max-len
      'Id du conseiller;Prénom;Nom;Email;Email @conseiller-numerique.fr;Compte Activé;Id de la structure;Nom de la structure;Email de la structure;Adresse de la structure;Code département de la structure;Code Postal du conseiller;Code département du conseiller;Date de recrutement;Date de fin de formation;GroupeCRA;Certification;Activé;CRA Saisis;Nombre de personne accompagné;Nom Supérieur hiérarchique;Prénom supérieur hiérarchique;Fonction supérieur hiérarchique;Email supérieur hiérarchique;Numéro téléphone supérieur hiérarchique;Historique des groupes CRA\n' +
      // eslint-disable-next-line max-len
      '50;John;Doe;john.doe@conseiller-numerique.fr;;Non;1234;Association pour laccès au numérique;test@mail.fr;12 avenue du pont;69000;69005;;27/01/2021;12/03/2021;0;Non;Non;12;10;;;;;"";"groupe 0 le 25/04/2022|groupe 1 le 25/04/2022"'
    );
  });
});
