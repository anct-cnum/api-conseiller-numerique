#!/usr/bin/env node
'use strict';

/* eslint-disable no-undef */

const {
  checkRoleCandidat,
  checkConseillerHaveCV,
  checkFormulaire } = require('./conseillers.function');

describe('check role candidat', () => {
  it('should check if user has role candidat', () => {

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

  it('should check if user has role candidat and is not the good candidat', () => {

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

  it('should check if user has not role candidat', () => {

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

describe('check candidat cv', () => {
  it('should check candidat with CV', () => {

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

  it('should check candidat without CV', () => {

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

describe('check Formulaire Sexe/Age', () => {
  it('should check  99 > age > 18 and sexe is not empty', () => {

    const bodyValid = {
      sexe: 'Homme',
      dateDeNaissance: new Date('1980-01-01')
    };

    const formValid = checkFormulaire(bodyValid);

    expect(formValid.error).toBe(undefined);

  });

  it('should check age > 99', () => {

    const bodyTooOld = {
      sexe: 'Homme',
      dateDeNaissance: new Date('1880-01-01')
    };

    const formTooOld = checkFormulaire(bodyTooOld);


    expect(formTooOld.error).toMatchObject(new Error('La date de naissance est invalide'));

  });

  it('should check age < 18', () => {

    const bodyTooYoung = {
      sexe: 'Homme',
      dateDeNaissance: new Date()
    };

    const formTooYoung = checkFormulaire(bodyTooYoung);

    expect(formTooYoung.error).toMatchObject(new Error('La date de naissance est invalide'));

  });

  it('should check sexe is empty', () => {

    const bodyWithoutSexe = {
      dateDeNaissance: new Date('1980-01-01')
    };

    const formWithoutSexe = checkFormulaire(bodyWithoutSexe);

    expect(formWithoutSexe.error).toMatchObject(new Error('Le sexe est invalide'));

  });

});
