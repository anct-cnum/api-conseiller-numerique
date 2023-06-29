const { listeCoordinateurs, listeConseillers } = require('./coordinateurs.core');


describe('liste des coordinateurs', () => {
  it('devrait avoir les informations de base (id, nom, prénom) avec les informations de sa permanence principale si renseignée', async () => {
    const coordinateur = {
      _id: 'abf48891b3f44bdf86bb7bc2601d3d5b',
      prenom: 'JEAN-CLAUDE',
      nom: 'RISITAS DUPONT',
      emailPro: 'jean.risitas@test.com',
      telephonePro: '+33122223333',
      listeSubordonnes: {
        type: 'conseillers',
        liste: ['abf48891b3f44bdf86bb7bc2601d3d5c', 'abf48891b3f44bdf86bb7bc2601d3d5d']
      },
      permanence: {
        adresse: {
          ville: 'Paris',
          codePostal: '51100',
          numeroRue: '12 BIS',
          rue: 'RUE DE LECLERCQ'
        },
        location: {
          type: 'Point',
          coordinates: [6.195988106, 49.10819284]
        }
      },
      structure: {
        nomCommune: 'Joinville-le-Pont',
        codePostal: '94042',
        location: {
          type: 'Point',
          coordinates: [2.1681, 48.8173]
        },
        coordonneesInsee: {
          type: 'Point',
          coordinates: [2.51, 48.813453]
        },
        insee: {
          etablissement: {
            adresse: {
              numero_voie: '14',
              type_voie: 'RUE',
              nom_voie: 'LOUIS TALAMONI',
              complement_adresse: null,
              code_postal: '94500',
              localite: 'CHAMPIGNY-SUR-MARNE',
            }
          }
        },
      },
    };

    const statsCoordination = {
      nbConseillers: 2,
      nbStructures: [
        'abf48891b3f44bdf86bb7bc2601d3dgg',
        'abf48891b3f44bdf86bb7bc2601d3dhh',
      ]
    };

    const resultat = await listeCoordinateurs({
      getCoordinateurs: () => [coordinateur],
      getStatsCoordination: () => [statsCoordination]
    });

    expect(resultat).toStrictEqual([
      {
        'id': 'abf48891b3f44bdf86bb7bc2601d3d5b',
        'prenom': 'Jean-Claude',
        'nom': 'Risitas Dupont',
        'commune': 'Paris',
        'codePostal': '51100',
        'adresse': '12 BIS RUE DE LECLERCQ, 51100 Paris',
        'courriel': 'jean.risitas@test.com',
        'telephone': '+33122223333',
        'perimetre': 'Bassin de vie',
        'nombreDePersonnesCoordonnees': 2,
        'nombreDeStructuresAvecDesPersonnesCoordonnees': 2,
        'dispositif': 'CnFS',
        'latitude': 49.10819284,
        'longitude': 6.195988106
      }
    ]);
  });

  // eslint-disable-next-line max-len
  it(`devrait avoir les informations de base (id, nom, prénom) avec les informations de sa structure si la permanence principale n'est pas renseignée`, async () => {
    const coordinateur = {
      _id: 'abf48891b3f44bdf86bb7bc2601d3d5b',
      prenom: 'JEAN-CLAUDE',
      nom: 'RISITAS DUPONT',
      emailPro: 'jean.risitas@test.com',
      telephonePro: '+33122223333',
      listeSubordonnes: {
        type: 'conseillers',
        liste: ['abf48891b3f44bdf86bb7bc2601d3d5c', 'abf48891b3f44bdf86bb7bc2601d3d5d']
      },
      structure: {
        nomCommune: 'Joinville-le-Pont',
        codePostal: '94042',
        location: {
          type: 'Point',
          coordinates: [2.1681, 48.8173]
        },
        insee: {
          etablissement: {
            adresse: {
              numero_voie: '14',
              type_voie: 'RUE',
              nom_voie: 'LOUIS TALAMONI',
              complement_adresse: null,
              code_postal: '94500',
              localite: 'CHAMPIGNY-SUR-MARNE',
            }
          }
        },
      },
    };

    const statsCoordination = {
      nbConseillers: 2,
      nbStructures: [
        'abf48891b3f44bdf86bb7bc2601d3dgg',
        'abf48891b3f44bdf86bb7bc2601d3dhh',
      ]
    };

    const resultat = await listeCoordinateurs({
      getCoordinateurs: () => [coordinateur],
      getStatsCoordination: () => [statsCoordination]
    });

    expect(resultat).toStrictEqual([
      {
        'id': 'abf48891b3f44bdf86bb7bc2601d3d5b',
        'prenom': 'Jean-Claude',
        'nom': 'Risitas Dupont',
        'commune': 'Joinville-le-Pont',
        'codePostal': '94042',
        'adresse': '14 RUE LOUIS TALAMONI, 94500 CHAMPIGNY-SUR-MARNE',
        'courriel': 'jean.risitas@test.com',
        'telephone': '+33122223333',
        'perimetre': 'Bassin de vie',
        'nombreDePersonnesCoordonnees': 2,
        'nombreDeStructuresAvecDesPersonnesCoordonnees': 2,
        'dispositif': 'CnFS',
        'latitude': 48.8173,
        'longitude': 2.1681
      }
    ]);
  });

  it(`devrait avoir les coordonnées location INSEE si présentes et si la permanence principale n'est pas renseignée`, async () => {
    const coordinateur = {
      _id: 'abf48891b3f44bdf86bb7bc2601d3d5b',
      prenom: 'JEAN-CLAUDE',
      nom: 'RISITAS DUPONT',
      emailPro: 'jean.risitas@test.com',
      telephonePro: '+33122223333',
      listeSubordonnes: {
        type: 'conseillers',
        liste: ['abf48891b3f44bdf86bb7bc2601d3d5c', 'abf48891b3f44bdf86bb7bc2601d3d5d']
      },
      structure: {
        nomCommune: 'Joinville-le-Pont',
        codePostal: '94042',
        location: {
          type: 'Point',
          coordinates: [2.1681, 48.8173]
        },
        coordonneesInsee: {
          type: 'Point',
          coordinates: [2.51, 48.813453]
        },
        insee: {
          etablissement: {
            adresse: {
              numero_voie: '14',
              type_voie: 'RUE',
              nom_voie: 'LOUIS TALAMONI',
              complement_adresse: null,
              code_postal: '94500',
              localite: 'CHAMPIGNY-SUR-MARNE',
            }
          }
        },
      },
    };

    const statsCoordination = {
      nbConseillers: 2,
      nbStructures: [
        'abf48891b3f44bdf86bb7bc2601d3dgg',
        'abf48891b3f44bdf86bb7bc2601d3dhh',
      ]
    };

    const resultat = await listeCoordinateurs({
      getCoordinateurs: () => [coordinateur],
      getStatsCoordination: () => [statsCoordination]
    });

    expect(resultat).toStrictEqual([
      {
        'id': 'abf48891b3f44bdf86bb7bc2601d3d5b',
        'prenom': 'Jean-Claude',
        'nom': 'Risitas Dupont',
        'commune': 'Joinville-le-Pont',
        'codePostal': '94042',
        'adresse': '14 RUE LOUIS TALAMONI, 94500 CHAMPIGNY-SUR-MARNE',
        'courriel': 'jean.risitas@test.com',
        'telephone': '+33122223333',
        'perimetre': 'Bassin de vie',
        'nombreDePersonnesCoordonnees': 2,
        'nombreDeStructuresAvecDesPersonnesCoordonnees': 2,
        'dispositif': 'CnFS',
        'latitude': 48.813453,
        'longitude': 2.51
      }
    ]);
  });

  it(`devrait ne pas avoir de champs telephone & email si non renseignés`, async () => {
    const coordinateur = {
      _id: 'abf48891b3f44bdf86bb7bc2601d3d5b',
      prenom: 'JEAN-CLAUDE',
      nom: 'RISITAS DUPONT',
      listeSubordonnes: {
        type: 'conseillers',
        liste: ['abf48891b3f44bdf86bb7bc2601d3d5c', 'abf48891b3f44bdf86bb7bc2601d3d5d']
      },
      structure: {
        nomCommune: 'Joinville-le-Pont',
        codePostal: '94042',
        location: {
          type: 'Point',
          coordinates: [2.1681, 48.8173]
        },
        coordonneesInsee: {
          type: 'Point',
          coordinates: [2.51, 48.813453]
        },
        insee: {
          etablissement: {
            adresse: {
              numero_voie: '14',
              type_voie: 'RUE',
              nom_voie: 'LOUIS TALAMONI',
              complement_adresse: null,
              code_postal: '94500',
              localite: 'CHAMPIGNY-SUR-MARNE',
            }
          }
        },
      },
    };

    const statsCoordination = {
      nbConseillers: 2,
      nbStructures: [
        'abf48891b3f44bdf86bb7bc2601d3dgg',
        'abf48891b3f44bdf86bb7bc2601d3dhh',
      ]
    };

    const resultat = await listeCoordinateurs({
      getCoordinateurs: () => [coordinateur],
      getStatsCoordination: () => [statsCoordination]
    });

    expect(resultat).toStrictEqual([
      {
        'id': 'abf48891b3f44bdf86bb7bc2601d3d5b',
        'prenom': 'Jean-Claude',
        'nom': 'Risitas Dupont',
        'commune': 'Joinville-le-Pont',
        'codePostal': '94042',
        'adresse': '14 RUE LOUIS TALAMONI, 94500 CHAMPIGNY-SUR-MARNE',
        'perimetre': 'Bassin de vie',
        'nombreDePersonnesCoordonnees': 2,
        'nombreDeStructuresAvecDesPersonnesCoordonnees': 2,
        'dispositif': 'CnFS',
        'latitude': 48.813453,
        'longitude': 2.51
      }
    ]);
  });

  it(`devrait avoir un périmètre Départemental si le type coordinateurs est codeDepartement`, async () => {
    const coordinateur = {
      _id: 'abf48891b3f44bdf86bb7bc2601d3d5b',
      prenom: 'JEAN-CLAUDE',
      nom: 'RISITAS DUPONT',
      listeSubordonnes: {
        type: 'codeDepartement',
        liste: ['01', '02']
      },
      structure: {
        nomCommune: 'Joinville-le-Pont',
        codePostal: '94042',
        location: {
          type: 'Point',
          coordinates: [2.1681, 48.8173]
        },
        coordonneesInsee: {
          type: 'Point',
          coordinates: [2.51, 48.813453]
        },
        insee: {
          etablissement: {
            adresse: {
              numero_voie: '14',
              type_voie: 'RUE',
              nom_voie: 'LOUIS TALAMONI',
              complement_adresse: null,
              code_postal: '94500',
              localite: 'CHAMPIGNY-SUR-MARNE',
            }
          }
        },
      },
    };

    const statsCoordination = {
      nbConseillers: 2,
      nbStructures: [
        'abf48891b3f44bdf86bb7bc2601d3dgg',
        'abf48891b3f44bdf86bb7bc2601d3dhh',
      ]
    };

    const resultat = await listeCoordinateurs({
      getCoordinateurs: () => [coordinateur],
      getStatsCoordination: () => [statsCoordination]
    });

    expect(resultat).toStrictEqual([
      {
        'id': 'abf48891b3f44bdf86bb7bc2601d3d5b',
        'prenom': 'Jean-Claude',
        'nom': 'Risitas Dupont',
        'commune': 'Joinville-le-Pont',
        'codePostal': '94042',
        'adresse': '14 RUE LOUIS TALAMONI, 94500 CHAMPIGNY-SUR-MARNE',
        'perimetre': 'Départemental',
        'nombreDePersonnesCoordonnees': 2,
        'nombreDeStructuresAvecDesPersonnesCoordonnees': 2,
        'dispositif': 'CnFS',
        'latitude': 48.813453,
        'longitude': 2.51
      }
    ]);
  });

  it(`devrait avoir un périmètre Régional si le type coordinateurs est codeRegion`, async () => {
    const coordinateur = {
      _id: 'abf48891b3f44bdf86bb7bc2601d3d5b',
      prenom: 'JEAN-CLAUDE',
      nom: 'RISITAS DUPONT',
      listeSubordonnes: {
        type: 'codeRegion',
        liste: ['01', '02']
      },
      structure: {
        nomCommune: 'Joinville-le-Pont',
        codePostal: '94042',
        location: {
          type: 'Point',
          coordinates: [2.1681, 48.8173]
        },
        coordonneesInsee: {
          type: 'Point',
          coordinates: [2.51, 48.813453]
        },
        insee: {
          etablissement: {
            adresse: {
              numero_voie: '14',
              type_voie: 'RUE',
              nom_voie: 'LOUIS TALAMONI',
              complement_adresse: null,
              code_postal: '94500',
              localite: 'CHAMPIGNY-SUR-MARNE',
            }
          }
        },
      },
    };

    const statsCoordination = {
      nbConseillers: 2,
      nbStructures: [
        'abf48891b3f44bdf86bb7bc2601d3dgg',
        'abf48891b3f44bdf86bb7bc2601d3dhh',
      ]
    };

    const resultat = await listeCoordinateurs({
      getCoordinateurs: () => [coordinateur],
      getStatsCoordination: () => [statsCoordination]
    });

    expect(resultat).toStrictEqual([
      {
        'id': 'abf48891b3f44bdf86bb7bc2601d3d5b',
        'prenom': 'Jean-Claude',
        'nom': 'Risitas Dupont',
        'commune': 'Joinville-le-Pont',
        'codePostal': '94042',
        'adresse': '14 RUE LOUIS TALAMONI, 94500 CHAMPIGNY-SUR-MARNE',
        'perimetre': 'Régional',
        'nombreDePersonnesCoordonnees': 2,
        'nombreDeStructuresAvecDesPersonnesCoordonnees': 2,
        'dispositif': 'CnFS',
        'latitude': 48.813453,
        'longitude': 2.51
      }
    ]);
  });


});

describe('liste des conseillers', () => {
  it('devrait avoir les informations de base (id, nom, prénom) avec les informations de sa structure', async () => {
    const conseiller = {
      _id: 'abf48891b3f44bdf86bb7bc2601d3d5b',
      prenom: 'Riri',
      nom: 'FIFI',
      listeSubordonnes: {
        type: 'codeRegion',
        liste: ['01', '02']
      },
      structure: {
        nom: 'CCAS',
        location: {
          type: 'Point',
          coordinates: [2.1681, 48.8173]
        },
        coordonneesInsee: {
          type: 'Point',
          coordinates: [2.51, 48.813453]
        },
        insee: {
          etablissement: {
            adresse: {
              numero_voie: '14',
              type_voie: 'RUE',
              nom_voie: 'LOUIS TALAMONI',
              complement_adresse: null,
              code_postal: '94500',
              localite: 'CHAMPIGNY-SUR-MARNE',
            }
          }
        },
      },
    };

    const resultat = await listeConseillers({
      getConseillers: () => [conseiller],
      getPermanences: () => []
    });

    expect(resultat).toStrictEqual([
      {
        'id': 'abf48891b3f44bdf86bb7bc2601d3d5b',
        'nom': 'Riri Fifi',
        'latitude': 48.813453,
        'longitude': 2.51,
        'structurePorteuse': {
          'nom': 'CCAS',
          'adresse': '14 RUE LOUIS TALAMONI, 94500 CHAMPIGNY-SUR-MARNE',
        },
        'lieuActivitePrincipal': {},
        'lieuActivite': [],
      }
    ]);
  });

  it('devrait avoir les informations email et téléphone si renseignées', async () => {
    const conseiller = {
      _id: 'abf48891b3f44bdf86bb7bc2601d3d5b',
      prenom: 'Riri',
      nom: 'FIFI',
      emailPro: 'riri.fifi@test.fr',
      telephonePro: '+33122223333',
      listeSubordonnes: {
        type: 'codeRegion',
        liste: ['01', '02']
      },
      structure: {
        nom: 'CCAS',
        location: {
          type: 'Point',
          coordinates: [2.1681, 48.8173]
        },
        coordonneesInsee: {
          type: 'Point',
          coordinates: [2.51, 48.813453]
        },
        insee: {
          etablissement: {
            adresse: {
              numero_voie: '14',
              type_voie: 'RUE',
              nom_voie: 'LOUIS TALAMONI',
              complement_adresse: null,
              code_postal: '94500',
              localite: 'CHAMPIGNY-SUR-MARNE',
            }
          }
        },
      },
    };

    const resultat = await listeConseillers({
      getConseillers: () => [conseiller],
      getPermanences: () => []
    });

    expect(resultat).toStrictEqual([
      {
        'id': 'abf48891b3f44bdf86bb7bc2601d3d5b',
        'nom': 'Riri Fifi',
        'latitude': 48.813453,
        'longitude': 2.51,
        'courriel': 'riri.fifi@test.fr',
        'telephone': '+33122223333',
        'structurePorteuse': {
          'nom': 'CCAS',
          'adresse': '14 RUE LOUIS TALAMONI, 94500 CHAMPIGNY-SUR-MARNE',
        },
        'lieuActivitePrincipal': {},
        'lieuActivite': [],
      }
    ]);
  });

  it('devrait avoir les informations de la permanence principale si renseignée', async () => {
    const conseiller = {
      _id: 'abf48891b3f44bdf86bb7bc2601d3d5b',
      prenom: 'Riri',
      nom: 'FIFI',
      emailPro: 'riri.fifi@test.fr',
      telephonePro: '+33122223333',
      listeSubordonnes: {
        type: 'codeRegion',
        liste: ['01', '02']
      },
      structure: {
        nom: 'CCAS',
        location: {
          type: 'Point',
          coordinates: [2.1681, 48.8173]
        },
        coordonneesInsee: {
          type: 'Point',
          coordinates: [2.51, 48.813453]
        },
        insee: {
          etablissement: {
            adresse: {
              numero_voie: '14',
              type_voie: 'RUE',
              nom_voie: 'LOUIS TALAMONI',
              complement_adresse: null,
              code_postal: '94500',
              localite: 'CHAMPIGNY-SUR-MARNE',
            }
          }
        },
      },
    };

    const permanences = [{
      _id: 'abf48891b3f44bdf86bb7bc2601d3666',
      nomEnseigne: 'Super permanence',
      adresse: {
        ville: 'Paris',
        codePostal: '51100',
        numeroRue: '12 BIS',
        rue: 'RUE DE LECLERCQ'
      },
      location: {
        type: 'Point',
        coordinates: [6.195988106, 49.10819284]
      },
      estPrincipale: true,
    }];

    const resultat = await listeConseillers({
      getConseillers: () => [conseiller],
      getPermanences: () => permanences
    });

    expect(resultat).toStrictEqual([
      {
        'id': 'abf48891b3f44bdf86bb7bc2601d3d5b',
        'nom': 'Riri Fifi',
        'latitude': 49.10819284,
        'longitude': 6.195988106,
        'courriel': 'riri.fifi@test.fr',
        'telephone': '+33122223333',
        'structurePorteuse': {
          'nom': 'CCAS',
          'adresse': '14 RUE LOUIS TALAMONI, 94500 CHAMPIGNY-SUR-MARNE',
        },
        'lieuActivitePrincipal': {
          'nom': 'Super permanence',
          'adresse': '12 BIS RUE DE LECLERCQ, 51100 Paris',
        },
        'lieuActivite': [],
      }
    ]);
  });

  it('devrait avoir les informations des permanences secondaires si renseignées', async () => {
    const conseiller = {
      _id: 'abf48891b3f44bdf86bb7bc2601d3d5b',
      prenom: 'Riri',
      nom: 'FIFI',
      emailPro: 'riri.fifi@test.fr',
      telephonePro: '+33122223333',
      listeSubordonnes: {
        type: 'codeRegion',
        liste: ['01', '02']
      },
      structure: {
        nom: 'CCAS',
        location: {
          type: 'Point',
          coordinates: [2.1681, 48.8173]
        },
        coordonneesInsee: {
          type: 'Point',
          coordinates: [2.51, 48.813453]
        },
        insee: {
          etablissement: {
            adresse: {
              numero_voie: '14',
              type_voie: 'RUE',
              nom_voie: 'LOUIS TALAMONI',
              complement_adresse: null,
              code_postal: '94500',
              localite: 'CHAMPIGNY-SUR-MARNE',
            }
          }
        },
      },
    };

    const permanences = [{
      _id: 'abf48891b3f44bdf86bb7bc2601d3666',
      nomEnseigne: 'Super permanence',
      adresse: {
        ville: 'Paris',
        codePostal: '51100',
        numeroRue: '12 BIS',
        rue: 'RUE DE LECLERCQ'
      },
      location: {
        type: 'Point',
        coordinates: [6.195988106, 49.10819284]
      },
      estPrincipale: true,
    }, {
      _id: 'abf48891b3f44bdf86bb7bc2601d3777',
      nomEnseigne: 'Permanence secondaire',
      adresse: {
        ville: 'Nantes',
        codePostal: '44000',
        numeroRue: '13',
        rue: 'RUE DE NANTES'
      },
      location: {
        type: 'Point',
        coordinates: [6.195988106, 49.10819284]
      },
      estPrincipale: false,
    }, {
      _id: 'abf48891b3f44bdf86bb7bc2601d3888',
      nomEnseigne: 'Permanence secondaire 2',
      adresse: {
        ville: 'Rennes',
        codePostal: '35000',
        numeroRue: '12',
        rue: 'RUE DE RENNES'
      },
      location: {
        type: 'Point',
        coordinates: [6.195988106, 49.10819284]
      },
      estPrincipale: false,
    }];

    const resultat = await listeConseillers({
      getConseillers: () => [conseiller],
      getPermanences: () => permanences
    });

    expect(resultat).toStrictEqual([
      {
        'id': 'abf48891b3f44bdf86bb7bc2601d3d5b',
        'nom': 'Riri Fifi',
        'latitude': 49.10819284,
        'longitude': 6.195988106,
        'courriel': 'riri.fifi@test.fr',
        'telephone': '+33122223333',
        'structurePorteuse': {
          'nom': 'CCAS',
          'adresse': '14 RUE LOUIS TALAMONI, 94500 CHAMPIGNY-SUR-MARNE',
        },
        'lieuActivitePrincipal': {
          'nom': 'Super permanence',
          'adresse': '12 BIS RUE DE LECLERCQ, 51100 Paris',
        },
        'lieuActivite': [{
          'id': 'abf48891b3f44bdf86bb7bc2601d3777',
          'nom': 'Permanence secondaire',
          'commune': 'Nantes',
          'codePostal': '44000'
        }, {
          'id': 'abf48891b3f44bdf86bb7bc2601d3888',
          'nom': 'Permanence secondaire 2',
          'commune': 'Rennes',
          'codePostal': '35000'
        }],
      }
    ]);
  });

  it('devrait avoir les informations des coordinateurs si coordoné', async () => {
    const conseiller = {
      _id: 'abf48891b3f44bdf86bb7bc2601d3d5b',
      prenom: 'Riri',
      nom: 'FIFI',
      emailPro: 'riri.fifi@test.fr',
      telephonePro: '+33122223333',
      listeSubordonnes: {
        type: 'codeRegion',
        liste: ['01', '02']
      },
      structure: {
        nom: 'CCAS',
        location: {
          type: 'Point',
          coordinates: [2.1681, 48.8173]
        },
        coordonneesInsee: {
          type: 'Point',
          coordinates: [2.51, 48.813453]
        },
        insee: {
          etablissement: {
            adresse: {
              numero_voie: '14',
              type_voie: 'RUE',
              nom_voie: 'LOUIS TALAMONI',
              complement_adresse: null,
              code_postal: '94500',
              localite: 'CHAMPIGNY-SUR-MARNE',
            }
          }
        },
      },
      coordinateurs: [{
        id: 'abf48891b3f44bdf86bb7bc2601d3665',
        prenom: 'carole',
        nom: 'animatrice',
      }, {
        id: 'abf48891b3f44bdf86bb7bc2601d3775',
        prenom: 'jean',
        nom: 'animateur',
      }]
    };

    const permanences = [{
      _id: 'abf48891b3f44bdf86bb7bc2601d3666',
      nomEnseigne: 'Super permanence',
      adresse: {
        ville: 'Paris',
        codePostal: '51100',
        numeroRue: '12 BIS',
        rue: 'RUE DE LECLERCQ'
      },
      location: {
        type: 'Point',
        coordinates: [6.195988106, 49.10819284]
      },
      estPrincipale: true,
    }, {
      _id: 'abf48891b3f44bdf86bb7bc2601d3777',
      nomEnseigne: 'Permanence secondaire',
      adresse: {
        ville: 'Nantes',
        codePostal: '44000',
        numeroRue: '13',
        rue: 'RUE DE NANTES'
      },
      location: {
        type: 'Point',
        coordinates: [6.195988106, 49.10819284]
      },
      estPrincipale: false,
    }, {
      _id: 'abf48891b3f44bdf86bb7bc2601d3888',
      nomEnseigne: 'Permanence secondaire 2',
      adresse: {
        ville: 'Rennes',
        codePostal: '35000',
        numeroRue: '12',
        rue: 'RUE DE RENNES'
      },
      location: {
        type: 'Point',
        coordinates: [6.195988106, 49.10819284]
      },
      estPrincipale: false,
    }];

    const resultat = await listeConseillers({
      getConseillers: () => [conseiller],
      getPermanences: () => permanences
    });

    expect(resultat).toStrictEqual([
      {
        'id': 'abf48891b3f44bdf86bb7bc2601d3d5b',
        'coordinateurs': [
          {
            'id': 'abf48891b3f44bdf86bb7bc2601d3665',
            'nom': 'Carole Animatrice'
          },
          {
            'id': 'abf48891b3f44bdf86bb7bc2601d3775',
            'nom': 'Jean Animateur'
          }
        ],
        'nom': 'Riri Fifi',
        'latitude': 49.10819284,
        'longitude': 6.195988106,
        'courriel': 'riri.fifi@test.fr',
        'telephone': '+33122223333',
        'structurePorteuse': {
          'nom': 'CCAS',
          'adresse': '14 RUE LOUIS TALAMONI, 94500 CHAMPIGNY-SUR-MARNE',
        },
        'lieuActivitePrincipal': {
          'nom': 'Super permanence',
          'adresse': '12 BIS RUE DE LECLERCQ, 51100 Paris',
        },
        'lieuActivite': [{
          'id': 'abf48891b3f44bdf86bb7bc2601d3777',
          'nom': 'Permanence secondaire',
          'commune': 'Nantes',
          'codePostal': '44000'
        }, {
          'id': 'abf48891b3f44bdf86bb7bc2601d3888',
          'nom': 'Permanence secondaire 2',
          'commune': 'Rennes',
          'codePostal': '35000'
        }],
      }
    ]);
  });

});
