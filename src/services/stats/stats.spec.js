#!/usr/bin/env node
'use strict';

/* eslint-disable no-undef */

const {
  checkAuth,
  checkRole,
  checkSchema,
  getTerritoires } = require('./stats.function');

const getDepartements = () => ([
  {
    _id: '619501799c612d326db31de6',
    date: '17/11/2021',
    nombreConseillersCoselec: 40,
    cnfsActives: 13,
    cnfsInactives: 27,
    conseillerIds: [
      '60462227871498b5cec245d7',
      '604621ae871498b5cec23a59',
      '60462066871498b5cec2184e',
      '60d49e28838083d339271a85',
      '60dc24f1838083d3397db45d',
      '6100663f838083d3394e6a5d',
      '60462000871498b5cec20c07',
      '604621bf871498b5cec23bed',
      '60854bd34f47999865c2c58c',
      '60462061871498b5cec217ab',
      '60c8eaef838083d339a1917f',
      '60462036871498b5cec212a4',
      '6046223a871498b5cec2474f',
      '60462257871498b5cec24a06'
    ],
    codeDepartement: '01',
    codeRegion: '84',
    nomDepartement: 'Ain',
    nomRegion: 'Auvergne-Rhône-Alpes',
    tauxActivation: 33
  }
]);

const getRegions = () => ([
  {
    _id: { codeRegion: '01', nomRegion: 'Guadeloupe' },
    nombreConseillersCoselec: 39,
    cnfsActives: 17,
    cnfsInactives: 22,
    codeRegion: '01',
    nomRegion: 'Guadeloupe',
    conseillerIds: [
      '604621e2871498b5cec23f57',
      '60462036871498b5cec212af',
      '6046224e871498b5cec24926',
      '60462090871498b5cec21d15',
      '60d50edd838083d3392c7fac',
      '6091fc43838083d33950f476',
      '609e828f838083d339d3a0c9',
      '61001fb0838083d3394a638c',
      '609e90d3838083d339d420ca',
      '60630891250d66297ef275a6',
      '60462231871498b5cec246b0',
      '60a2cb79838083d339fb9289',
      '60afb453838083d339838083',
      '6046208c871498b5cec21c9c',
      '6046208e871498b5cec21cd5',
      '60462183871498b5cec23623',
      '604621cb871498b5cec23d21',
      '60462238871498b5cec2471d',
      '608abc184f47999865f8d614',
      '608ddda6838083d339252b16',
      '60c299e9838083d33959de41',
      '60f9a499838083d339fba163'
    ]
  }
]);

describe('Vérification de l\'authentification', () => {
  it('devrait être considérée comme valide lorsque l\'utilisateur possède une clé d\'authentification', () => {

    const req = {
      feathers: {
        authentication: {
          strategy: 'jwt',
          accessToken: 'eyJhbGI1NiIsInRciOiJIUFjY2QiOcCeV4IHR0cjE2MzcxY29uc2VpWUuZ291di5mciIsImlzcyI6ImZlYXRoahxgOzpfU'
        }
      }
    };

    const userAuthenticated = checkAuth(req);

    expect(userAuthenticated).toBe(true);
  });

  it('devrait être considérée comme invalide lorsque l\'utilisateur ne possède pas de clé d\'authentification', () => {

    const req = { feathers: {} };

    const userAuthenticated = checkAuth(req);

    expect(userAuthenticated).toBe(false);
  });
});

describe('Vérification du role de l\'utilisateur', () => {
  it('devrait être considérée comme valide lorsque l\'utilisateur contient bien admin_coop parmi ses roles', () => {

    const roles = ['admin', 'admin_coop'];

    const userWithRoleAdmin = checkRole(roles, 'admin_coop');

    expect(userWithRoleAdmin).toBe(true);
  });

  it('devrait être considérée comme invalide lorsque l\'utilisateur ne contient pas admin_coop parmi ses roles', () => {

    const roles = ['conseiller'];

    const userWithRoleAdmin = checkRole(roles, 'admin_coop');

    expect(userWithRoleAdmin).toBe(false);
  });
});


describe('Vérification des données pour obtenir les statistiques des territoires', () => {
  it('devrait être considérée comme valide lorsque la page, le territoire, les dates de' +
     'début et fin de période, le nom et l\'ordre du tri sont bien renseignés', () => {

    const bodyValid = {
      query: {
        territoire: 'codeDepartement',
        dateDebut: new Date(),
        dateFin: new Date(),
        page: '1',
        nomOrdre: 'codeDepartement',
        ordre: '1'
      }
    };

    const formValid = checkSchema(bodyValid);

    expect(formValid.error).toBe(undefined);
  });

  it('devrait être considérée comme valide lorsque le territoire n\'est pas renseignés', () => {
    const bodyInvalideTerritoire = {
      query: {
        dateDebut: new Date(),
        dateFin: new Date(),
        page: '1',
        nomOrdre: 'codeDepartement',
        ordre: '1'
      }
    };

    const formInvalideTerritoire = checkSchema(bodyInvalideTerritoire);

    expect(formInvalideTerritoire.error).toMatchObject(new Error('Le type de territoire est invalide'));
  });

  it('devrait être considérée comme valide lorsque la page, le territoire, la date de début de période n\'est pas renseignés', () => {

    const bodyInvalideDateDebut = {
      query: {
        territoire: 'codeDepartement',
        dateFin: new Date(),
        page: '1',
        nomOrdre: 'codeDepartement',
        ordre: '1'
      }
    };

    const formInvalideateDebut = checkSchema(bodyInvalideDateDebut);

    expect(formInvalideateDebut.error).toMatchObject(new Error('La date de début est invalide'));
  });

  it('devrait être considérée comme valide lorsque la date de fin de période n\'est pas renseignés', () => {

    const bodyInvalideDateFin = {
      query: {
        territoire: 'codeDepartement',
        dateDebut: new Date(),
        page: '1',
        nomOrdre: 'codeDepartement',
        ordre: '1'
      }
    };

    const formInvalideDateFin = checkSchema(bodyInvalideDateFin);

    expect(formInvalideDateFin.error).toMatchObject(new Error('La date de fin est invalide'));
  });

  it('devrait être considérée comme valide lorsque la page n\'est pas renseignés', () => {

    const bodyInvalidePage = {
      query: {
        territoire: 'codeDepartement',
        dateDebut: new Date(),
        dateFin: new Date(),
        nomOrdre: 'codeDepartement',
        ordre: '1'
      }
    };

    const formInvalidePage = checkSchema(bodyInvalidePage);

    expect(formInvalidePage.error).toMatchObject(new Error('Le numéro de page est invalide'));
  });

  it('devrait être considérée comme valide lorsque le nom du tri n\'est pas renseignés', () => {

    const bodyInvalideNomOrdre = {
      query: {
        territoire: 'codeDepartement',
        dateDebut: new Date(),
        dateFin: new Date(),
        page: '1',
        ordre: '1'
      }
    };

    const formInvalideNomOrdre = checkSchema(bodyInvalideNomOrdre);

    expect(formInvalideNomOrdre.error).toMatchObject(new Error('Le nom de l\'ordre est invalide'));
  });

  it('devrait être considérée comme invalide lorsque l\'ordre du tri n\'est pas renseignés', () => {

    const bodyInvalideOrdre = {
      query: {
        territoire: 'codeDepartement',
        dateDebut: new Date(),
        dateFin: new Date(),
        page: '1',
        nomOrdre: 'codeDepartement',
      }
    };

    const formInvalideOrdre = checkSchema(bodyInvalideOrdre);

    expect(formInvalideOrdre.error).toMatchObject(new Error('L\'ordre est invalide'));
  });
});

describe('Vérification des statistiques par département ou région', () => {
  it('devrait être considérée comme valide lorsque la liste des départements est obtenue', () => {

    const listDepartements = [
      {
        _id: '619501799c612d326db31de6',
        date: '17/11/2021',
        nombreConseillersCoselec: 40,
        cnfsActives: 13,
        cnfsInactives: 27,
        conseillerIds: [
          '60462227871498b5cec245d7',
          '604621ae871498b5cec23a59',
          '60462066871498b5cec2184e',
          '60d49e28838083d339271a85',
          '60dc24f1838083d3397db45d',
          '6100663f838083d3394e6a5d',
          '60462000871498b5cec20c07',
          '604621bf871498b5cec23bed',
          '60854bd34f47999865c2c58c',
          '60462061871498b5cec217ab',
          '60c8eaef838083d339a1917f',
          '60462036871498b5cec212a4',
          '6046223a871498b5cec2474f',
          '60462257871498b5cec24a06'
        ],
        codeDepartement: '01',
        codeRegion: '84',
        nomDepartement: 'Ain',
        nomRegion: 'Auvergne-Rhône-Alpes',
        tauxActivation: 33
      }
    ];

    const type = 'codeDepartement';
    const date = new Date();
    const ordre = { codeDepartement: 1 };
    const page = 1;
    const limit = 1;

    const getListDepartements = getTerritoires(type, date, ordre, page, limit, { getDepartements, getRegions });

    expect(getListDepartements).toBe(listDepartements);
  });

  it('devrait être considérée comme valide lorsque la liste des régions est obtenue', () => {

    const listRegions = [
      {
        _id: { codeRegion: '01', nomRegion: 'Guadeloupe' },
        nombreConseillersCoselec: 39,
        cnfsActives: 17,
        cnfsInactives: 22,
        codeRegion: '01',
        nomRegion: 'Guadeloupe',
        conseillerIds: [
          '604621e2871498b5cec23f57',
          '60462036871498b5cec212af',
          '6046224e871498b5cec24926',
          '60462090871498b5cec21d15',
          '60d50edd838083d3392c7fac',
          '6091fc43838083d33950f476',
          '609e828f838083d339d3a0c9',
          '61001fb0838083d3394a638c',
          '609e90d3838083d339d420ca',
          '60630891250d66297ef275a6',
          '60462231871498b5cec246b0',
          '60a2cb79838083d339fb9289',
          '60afb453838083d339838083',
          '6046208c871498b5cec21c9c',
          '6046208e871498b5cec21cd5',
          '60462183871498b5cec23623',
          '604621cb871498b5cec23d21',
          '60462238871498b5cec2471d',
          '608abc184f47999865f8d614',
          '608ddda6838083d339252b16',
          '60c299e9838083d33959de41',
          '60f9a499838083d339fba163'
        ]
      }
    ];

    const type = 'codeRegion';
    const date = new Date();
    const ordre = { codeRegion: 1 };
    const page = 1;
    const limit = 1;

    const getListRegions = getTerritoires(type, date, ordre, page, limit, { getDepartements, getRegions });

    expect(getListRegions).toBe(listRegions);
  });
});
