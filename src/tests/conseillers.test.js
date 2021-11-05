#!/usr/bin/env node
'use strict';

/* eslint-disable no-undef */

const { mockRequest, mockResponse } = require('jest-mock-req-res');

const { checkConseillerHaveCV } = require('../services/conseillers/conseillers.function');

const conseillerCV = {
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

const conseillerNoCV = {
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
const user = {
  _id: '60f032fcbba64f21c2964523',
  name: 'morgan.candidat@beta.gouv.fr',
  roles: [
    'candidat'
  ],
  entity: {
    $ref: 'conseillers',
    $id: '60f0357bbba64f21c296461a',
    $db: 'conseiller-numerique'
  },
  token: null,
  mailSentDate: null,
  passwordCreated: true,
  createdAt: new Date('2021-03-24'),
  tokenCreatedAt: null
};

describe('check conseiller cv', () => {
  let res = {
    status: function(s) {
      this.statusCode = s;
      return this;
    }
  };

  expect(checkConseillerHaveCV(conseillerCV, user, res)).toBeUndefined();
  expect(checkConseillerHaveCV(conseillerNoCV, user, res)).anything();
});
