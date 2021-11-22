#!/usr/bin/env node
'use strict';

/* eslint-disable no-undef */

const {
  checkAuth,
  checkRole,
  checkSchema } = require('./stats.function');

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
