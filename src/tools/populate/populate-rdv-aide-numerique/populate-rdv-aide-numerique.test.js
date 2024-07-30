#!/usr/bin/env node
'use strict';

const { isValidObjectId, getStructureIdsOldUrl } = require('./populate-rdv-aide-numerique.utils');

describe('Vérification de la validité d\'une chaîne reçue en tant que OID', () => {

  it('devrait retourner faux si l\'id vaut null', () => {

    const id = null;
    expect(isValidObjectId(id)).toBe(false);

  });

  it('devrait retourner faux si l\'id vaut undefined', () => {

    const id = undefined;
    expect(isValidObjectId(id)).toBe(false);

  });

  it('devrait retourner faux si l\'id vaut une chaine vide', () => {

    const id = '';
    expect(isValidObjectId(id)).toBe(false);

  });

  it('devrait retourner faux si l\'id vaut une chaine non valide', () => {

    const id = '3f06e994488';
    expect(isValidObjectId(id)).toBe(false);

  });

  it('devrait retourner faux si l\'id vaut un nombre', () => {

    const id = 1234;
    expect(isValidObjectId(id)).toBe(false);

  });

  it('devrait retourner vrai si l\'id vaut une chaine OID valide', () => {

    const id = '003fb55a5d999071c4ec5999';
    expect(isValidObjectId(id)).toBe(true);

  });

});

describe('Récupération des structures dont l\'url n\'est plus présente dans la liste reçue', () => {

  it('devrait retourner vide si aucune structure n\'est trouvée avec URL en BDD', () => {

    const urlsReceived = [
      {
        external_id: '003fb55a5d999071c4ec5999',
        public_link: 'https://www.url-rdv'
      },
      {
        external_id: '003fb55a5d666071c4ec5666',
        public_link: 'https://www.url-rdv2'
      }
    ];

    const structuresWithUrlsDb = [];

    const result = getStructureIdsOldUrl(urlsReceived, structuresWithUrlsDb);

    expect(result).toEqual([]);

  });

  it('devrait retourner vide si les structures trouvées avec URL en BDD sont également présentes dans la liste reçue', () => {

    const urlsReceived = [
      {
        external_id: '003fb55a5d999071c4ec5999',
        public_link: 'https://www.url-rdv'
      },
      {
        external_id: '003fb55a5d666071c4ec5666',
        public_link: 'https://www.url-rdv2'
      }
    ];

    const structuresWithUrlsDb = [
      { _id: '003fb55a5d999071c4ec5999' },
      { _id: '003fb55a5d666071c4ec5666' },
    ];

    const result = getStructureIdsOldUrl(urlsReceived, structuresWithUrlsDb);

    expect(result).toEqual([]);

  });

  it('devrait retourner les structures trouvées avec URL en BDD qui ne sont pas présentes dans la liste reçue', () => {

    const urlsReceived = [
      {
        external_id: '003fb55a5d999071c4ec5999',
        public_link: 'https://www.url-rdv'
      },
      {
        external_id: '003fb55a5d666071c4ec5666',
        public_link: 'https://www.url-rdv2'
      }
    ];

    const structuresWithUrlsDb = [
      { _id: '003fb55a5d999071c4ec5000' },
      { _id: '003fb55a5d666071c4ec7777' },
    ];

    const result = getStructureIdsOldUrl(urlsReceived, structuresWithUrlsDb);

    expect(result).toEqual(['003fb55a5d999071c4ec5000', '003fb55a5d666071c4ec7777']);

  });

  it('devrait retourner uniquement la structure avec URL en BDD qui n\'est pas présente dans la liste reçue', () => {

    const urlsReceived = [
      {
        external_id: '003fb55a5d999071c4ec5999',
        public_link: 'https://www.url-rdv'
      },
      {
        external_id: '003fb55a5d666071c4ec5666',
        public_link: 'https://www.url-rdv2'
      }
    ];

    const structuresWithUrlsDb = [
      { _id: '003fb55a5d999071c4ec5999' },
      { _id: '003fb55a5d666071c4ec7777' },
    ];

    const result = getStructureIdsOldUrl(urlsReceived, structuresWithUrlsDb);

    expect(result).toEqual(['003fb55a5d666071c4ec7777']);

  });

});
