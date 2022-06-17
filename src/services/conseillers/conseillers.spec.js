#!/usr/bin/env node
'use strict';

/* eslint-disable no-undef */

const {
  checkRoleCandidat,
  checkRoleAdminCoop,
  checkConseillerHaveCV,
  checkFormulaire } = require('./conseillers.function');

describe('Vérification du role candidat', () => {
  it('devrait être considérée comme valide lorsque l\'utilisateur contient bien candidat parmi ses roles', () => {
    const userCandidat = {
      entity:
        {
          oid: '603fb55a5d284071c4ec5834'
        },
      name: 'candidat@test.fr',
      roles: [
        'candidat'
      ],
      mailSentDate: '2021-04-19T15:40:04.817Z',
      resend: false,
      token: null,
      tokenCreatedAt: null
    };
    const req = {
      params: {
        id: '603fb55a5d284071c4ec5834',
      }
    };
    const userWithRoleCandidat = checkRoleCandidat(userCandidat, req);

    expect(userWithRoleCandidat).toBe(true);
  });

  it('devrait être considérée comme invalide lorsque l\'utilisateur contient bien candidat parmi ses roles, mais que son id n\'est pas le bon', () => {

    const userCandidat = {
      entity:
        {
          oid: '603fb55a5d284071c4ec5834'
        },
      name: 'candidat@test.fr',
      roles: [
        'candidat'
      ],
      mailSentDate: '2021-04-19T15:40:04.817Z',
      resend: false,
      token: null,
      tokenCreatedAt: null
    };
    const req = {
      params: {
        id: '000005a5d45d071c4ec5834',
      }
    };
    const userWithRoleCandidat = checkRoleCandidat(userCandidat, req);

    expect(userWithRoleCandidat).toBe(false);
  });

  it('devrait être considérée comme invalide lorsque l\'utilisateur ne contient pas candidat parmi ses roles', () => {

    const userNotCandidat = {
      entity:
      {
        oid: '603fb55a5d284071c4ec5834'
      },
      name: 'conseiller@test.fr',
      roles: [
        'conseiller'
      ],
      mailSentDate: '2021-04-19T15:40:04.817Z',
      resend: false,
      token: null,
      tokenCreatedAt: null
    };
    const req = {
      params: {
        id: '603fb55a5d284071c4ec5834',
      }
    };

    const userWithoutRoleCandidat = checkRoleCandidat(userNotCandidat, req);

    expect(userWithoutRoleCandidat).toBe(false);
  });
});

describe('Vérification du role admin coop', () => {
  it('devrait être considérée comme faux lorsque l\'utilisateur ne contient pas admin_coop parmi ses roles', () => {
    const userNotAdminCoop = {
      name: 'conseiller@test.fr',
      roles: [
        'conseiller'
      ],
      mailSentDate: null,
      resend: false,
      token: null,
      tokenCreatedAt: null
    };

    const result = checkRoleAdminCoop(userNotAdminCoop);
    expect(result).toBe(false);
  });

  it('devrait être considérée comme vrai lorsque l\'utilisateur contient admin_coop parmi ses roles', () => {
    const userAdminCoop = {
      name: 'admin@test.fr',
      roles: [
        'admin',
        'admin_coop'
      ],
      mailSentDate: null,
      resend: false,
      token: null,
      tokenCreatedAt: null
    };

    const result = checkRoleAdminCoop(userAdminCoop);
    expect(result).toBe(true);
  });
});

describe('Vérification de la présence d\'un CV', () => {
  it('devrait être considérée comme valide lorsque le candidat a bien un CV', () => {

    const candidatCV = {
      _id: '60f0357bbba64f21c296461a',
      idPG: 44,
      prenom: 'Utilisateur',
      nom: 'CANDIDAT',
      email: 'utilisateur.candidat@beta.gouv.fr',
      emailConfirmedAt: new Date('2020-12-01'),
      emailConfirmationKey: '6A0SKUMR4J2Sm7dv8uAn8nLO05H3ajPdM4LNAvECl2fQ6SGDEa',
      unsubscribedAt: null,
      unsubscribeExtras: {},
      createdAt: new Date('2020-11-17'),
      updatedAt: new Date('2021-01-28'),
      importedAt: new Date('2021-03-08'),
      deletedAt: null,
      userCreated: true,
      cv: {
        file: '60f0357bbba64f21c296461a.pdf',
        extension: 'pdf',
        date: new Date('2021-11-02')
      }
    };

    const candidatWithCV = checkConseillerHaveCV(candidatCV);

    expect(candidatWithCV).toBe(true);
  });

  it('devrait être considérée comme invalide lorsque le candidat n\'a pas de CV', () => {

    const candidatNoCV = {
      _id: '60f0357bbba64f21c296461a',
      idPG: 44,
      prenom: 'Utilisateur',
      nom: 'CANDIDAT',
      email: 'utilisateur.candidat@beta.gouv.fr',
      emailConfirmedAt: new Date('2020-12-01'),
      emailConfirmationKey: '6A0SKUMR4J2Sm7dv8uAn8nLO05H3ajPdM4LNAvECl2fQ6SGDEa',
      unsubscribedAt: null,
      unsubscribeExtras: {},
      createdAt: new Date('2020-11-17'),
      updatedAt: new Date('2021-01-28'),
      importedAt: new Date('2021-03-08'),
      deletedAt: null,
      userCreated: true,
    };

    const candidatWithoutCV = checkConseillerHaveCV(candidatNoCV);

    expect(candidatWithoutCV).toBe(false);
  });
});

describe('Vérification du formulaire Sexe/Age', () => {
  it('devrait être considérée comme valide lorsque l\'utilisateur a un age compris entre 18 et 99 ans et que son sexe a été précisé', () => {

    const bodyValid = {
      sexe: 'Homme',
      dateDeNaissance: new Date('1980-01-01')
    };

    const formValid = checkFormulaire(bodyValid);

    expect(formValid.error).toBe(undefined);

  });

  it('devrait être considérée comme invalide lorsque l\'utilisateur a plus de 99 ans', () => {

    const bodyTooOld = {
      sexe: 'Homme',
      dateDeNaissance: new Date('1880-01-01')
    };

    const formTooOld = checkFormulaire(bodyTooOld);


    expect(formTooOld.error).toMatchObject(new Error('La date de naissance est invalide'));

  });

  it('devrait être considérée comme invalide lorsque l\'utilisateur n\'a pas 18 ans', () => {

    const bodyTooYoung = {
      sexe: 'Homme',
      dateDeNaissance: new Date()
    };

    const formTooYoung = checkFormulaire(bodyTooYoung);

    expect(formTooYoung.error).toMatchObject(new Error('La date de naissance est invalide'));

  });

  it('devrait être considérée comme invalide lorsque l\'utilisateur n\'a pas précisé son sexe', () => {

    const bodyWithoutSexe = {
      dateDeNaissance: new Date('1980-01-01')
    };

    const formWithoutSexe = checkFormulaire(bodyWithoutSexe);

    expect(formWithoutSexe.error).toMatchObject(new Error('Le sexe est invalide'));

  });

});
