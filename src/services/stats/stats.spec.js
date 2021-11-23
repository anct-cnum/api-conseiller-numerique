#!/usr/bin/env node
'use strict';

/* eslint-disable no-undef */

const {
  checkAuth,
  checkRole,
  checkSchema,
  getTerritoires } = require('./stats.function');

const departement = [{
  _id: '619501799c612d326db31de6',
  date: '17/11/2021',
  nombreConseillersCoselec: 40,
  cnfsActives: 13,
  cnfsInactives: 27,
  conseillerIds: [
    '64876222ec2d1498b557c047',
    '621ae871498b5cec20463a59',
    '6204966b871582184ce046ce',
    '623d3392883718080d49ea85',
    '67db8083450dc2d3394f183d',
    '6194e085d6a066033f83833d',
    '621498b5ec204000870cc607',
    '671bf8ed23b1ecc6204498b5',
    '698650834fbd2c5847995c4c',
    '6c21b5ce71701849846206ab',
    '6a1918eaef8380830d339c7f',
    '671e66820498b5cc212a0434',
    '6047487223a544cec2198b6f',
    '6e71a24906046c8422578b5c'
  ],
  codeDepartement: '01',
  codeRegion: '84',
  nomDepartement: 'Ain',
  nomRegion: 'Auvergne-Rhône-Alpes',
  tauxActivation: 33
}];

const region = [
  {
    _id: { codeRegion: '01', nomRegion: 'Guadeloupe' },
    nombreConseillersCoselec: 39,
    cnfsActives: 17,
    cnfsInactives: 22,
    codeRegion: '01',
    nomRegion: 'Guadeloupe',
    conseillerIds: [
      '604c287198b5ce34621e2f57',
      '68498b5203c2ce60471612af',
      '6c249871498b5046224ece26',
      '604c21d908716208b5ce4915',
      '60edd838083d3392cd507fac',
      '683d33950f091fc438380476',
      '628f838083d3309e89d3a0c9',
      '61b0838083d33001f94a638c',
      '609d90d383e3380839d420ca',
      '63089125927ef260660d75a6',
      '6e2311c462098b5c487246b0',
      '83a2cd339fb960b798380289',
      '83d339838afb603838045083',
      '60471498bec21c6205c8c89c',
      '6046e871498b20cec21c85d5',
      '69ec230462188b5c38714623',
      '60cb823d4621271498b5cec1',
      '688235cec24771498b04621d',
      '60bc1845af48799986f8d614',
      '6683808308dddd339a252b16',
      '6d33959d299e90c838083e41',
      '60998380f9aa1483d339fb63'
    ]
  }
];

const getDepartements = async () => departement;

const getRegions = async () => region;

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

  it('devrait être considérée comme invalide lorsque le territoire n\'est pas renseigné', () => {
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

  it('devrait être considérée comme invalide lorsque la page, le territoire, la date de début de période n\'est pas renseigné', () => {

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

  it('devrait être considérée comme invalide lorsque la date de fin de période n\'est pas renseigné', () => {

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

  it('devrait être considérée comme invalide lorsque la page n\'est pas renseigné', () => {

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

  it('devrait être considérée comme invalide lorsque le nom du tri n\'est pas renseigné', () => {

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

  it('devrait être considérée comme invalide lorsque l\'ordre du tri n\'est pas renseigné', () => {

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
  it('devrait être considérée comme valide lorsque la liste des départements est obtenue', async () => {

    const listDepartements = [
      {
        _id: '619501799c612d326db31de6',
        date: '17/11/2021',
        nombreConseillersCoselec: 40,
        cnfsActives: 13,
        cnfsInactives: 27,
        conseillerIds: [
          '64876222ec2d1498b557c047',
          '621ae871498b5cec20463a59',
          '6204966b871582184ce046ce',
          '623d3392883718080d49ea85',
          '67db8083450dc2d3394f183d',
          '6194e085d6a066033f83833d',
          '621498b5ec204000870cc607',
          '671bf8ed23b1ecc6204498b5',
          '698650834fbd2c5847995c4c',
          '6c21b5ce71701849846206ab',
          '6a1918eaef8380830d339c7f',
          '671e66820498b5cc212a0434',
          '6047487223a544cec2198b6f',
          '6e71a24906046c8422578b5c'
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

    const getListDepartements = await getTerritoires(type, date, ordre, page, limit, { getDepartements, getRegions });

    expect(getListDepartements).toStrictEqual(listDepartements);
  });

  it('devrait être considérée comme valide lorsque la liste des régions est obtenue', async () => {

    const listRegions = [
      {
        _id: { codeRegion: '01', nomRegion: 'Guadeloupe' },
        nombreConseillersCoselec: 39,
        cnfsActives: 17,
        cnfsInactives: 22,
        codeRegion: '01',
        nomRegion: 'Guadeloupe',
        conseillerIds: [
          '604c287198b5ce34621e2f57',
          '68498b5203c2ce60471612af',
          '6c249871498b5046224ece26',
          '604c21d908716208b5ce4915',
          '60edd838083d3392cd507fac',
          '683d33950f091fc438380476',
          '628f838083d3309e89d3a0c9',
          '61b0838083d33001f94a638c',
          '609d90d383e3380839d420ca',
          '63089125927ef260660d75a6',
          '6e2311c462098b5c487246b0',
          '83a2cd339fb960b798380289',
          '83d339838afb603838045083',
          '60471498bec21c6205c8c89c',
          '6046e871498b20cec21c85d5',
          '69ec230462188b5c38714623',
          '60cb823d4621271498b5cec1',
          '688235cec24771498b04621d',
          '60bc1845af48799986f8d614',
          '6683808308dddd339a252b16',
          '6d33959d299e90c838083e41',
          '60998380f9aa1483d339fb63'
        ]
      }
    ];

    const type = 'codeRegion';
    const date = new Date();
    const ordre = { codeRegion: 1 };
    const page = 1;
    const limit = 1;

    const getListRegions = await getTerritoires(type, date, ordre, page, limit, { getDepartements, getRegions });

    expect(getListRegions).toStrictEqual(listRegions);
  });
});
