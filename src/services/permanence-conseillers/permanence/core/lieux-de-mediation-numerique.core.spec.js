const { lieuxDeMediationNumerique, CNFS_COMMON_SERVICES } = require('./lieux-de-mediation-numerique.core');

describe('lieux de médiation numérique', () => {
  it('devrait avoir les informations obligatoires du schéma de médiation numérique avec extension CnFS', async () => {
    const permanence = {
      _id: 'abf48891b3f44bdf86bb7bc2601d3d5b',
      nomEnseigne: 'Anonymal',
      adresse: {
        ville: 'Reims',
        codePostal: '51100',
        numeroRue: '12 BIS',
        rue: 'RUE DE LECLERCQ'
      },
      structure: {
        _id: 'abc88891b3f44bdf86bb7bc2601d3ddd'
      },
      aidants: [
        { _id: 'aaa88891b3f44bdf86bb7bc2601d3fff', prenom: 'Jean', nom: 'Dupond', emailPro: 'jean.dupond@gouv.fr', telephonePro: '+33ZABPQMCDU' }
      ]
    };

    const lieux = await lieuxDeMediationNumerique({ getPermanences: () => [permanence] });

    expect(lieux).toStrictEqual([
      {
        id: 'abf48891b3f44bdf86bb7bc2601d3d5b',
        nom: 'Anonymal',
        commune: 'Reims',
        code_postal: '51100',
        adresse: '12 BIS RUE DE LECLERCQ',
        services: CNFS_COMMON_SERVICES,
        source: 'conseiller-numerique',
        conditions_access: 'Gratuit',
        labels_nationaux: 'CNFS',
        structureId: 'abc88891b3f44bdf86bb7bc2601d3ddd',
        aidants: [
          { aidantId: 'aaa88891b3f44bdf86bb7bc2601d3fff', nom: 'Jean Dupond', courriel: 'jean.dupond@gouv.fr', telephone: '+33ZABPQMCDU' }
        ]
      }
    ]);
  });

  it('devrait avoir un pivot avec le siret comme valeur', async () => {
    const permanence = {
      _id: 'abf48891b3f44bdf86bb7bc2601d3d5b',
      siret: '43493312300029',
      nomEnseigne: 'Anonymal',
      adresse: {
        ville: 'Reims',
        codePostal: '51100',
        numeroRue: '12 BIS',
        rue: 'RUE DE LECLERCQ'
      },
      structure: {
        _id: 'abc88891b3f44bdf86bb7bc2601d3ddd'
      },
      aidants: [
        { _id: 'aaa88891b3f44bdf86bb7bc2601d3fff', prenom: 'Jean', nom: 'Dupond', emailPro: 'jean.dupond@gouv.fr', telephonePro: '+33ZABPQMCDU' }
      ]
    };

    const lieux = await lieuxDeMediationNumerique({ getPermanences: () => [permanence] });

    expect(lieux).toStrictEqual([
      {
        id: 'abf48891b3f44bdf86bb7bc2601d3d5b',
        pivot: '43493312300029',
        nom: 'Anonymal',
        commune: 'Reims',
        code_postal: '51100',
        adresse: '12 BIS RUE DE LECLERCQ',
        services: CNFS_COMMON_SERVICES,
        source: 'conseiller-numerique',
        conditions_access: 'Gratuit',
        labels_nationaux: 'CNFS',
        structureId: 'abc88891b3f44bdf86bb7bc2601d3ddd',
        aidants: [
          { aidantId: 'aaa88891b3f44bdf86bb7bc2601d3fff', nom: 'Jean Dupond', courriel: 'jean.dupond@gouv.fr', telephone: '+33ZABPQMCDU' }
        ]
      }
    ]);
  });

  it('devrait avoir un pivot qui ne contient aucun espace', async () => {
    const permanence = {
      _id: 'abf48891b3f44bdf86bb7bc2601d3d5b',
      siret: '4349331 2300029 ',
      nomEnseigne: 'Anonymal',
      adresse: {
        ville: 'Reims',
        codePostal: '51100',
        numeroRue: '12 BIS',
        rue: 'RUE DE LECLERCQ'
      },
      structure: {
        _id: 'abc88891b3f44bdf86bb7bc2601d3ddd'
      },
      aidants: [
        { _id: 'aaa88891b3f44bdf86bb7bc2601d3fff', prenom: 'Jean', nom: 'Dupond', emailPro: 'jean.dupond@gouv.fr', telephonePro: '+33ZABPQMCDU' }
      ]
    };

    const lieux = await lieuxDeMediationNumerique({ getPermanences: () => [permanence] });

    expect(lieux).toStrictEqual([
      {
        id: 'abf48891b3f44bdf86bb7bc2601d3d5b',
        pivot: '43493312300029',
        nom: 'Anonymal',
        commune: 'Reims',
        code_postal: '51100',
        adresse: '12 BIS RUE DE LECLERCQ',
        services: CNFS_COMMON_SERVICES,
        source: 'conseiller-numerique',
        conditions_access: 'Gratuit',
        labels_nationaux: 'CNFS',
        structureId: 'abc88891b3f44bdf86bb7bc2601d3ddd',
        aidants: [
          { aidantId: 'aaa88891b3f44bdf86bb7bc2601d3fff', nom: 'Jean Dupond', courriel: 'jean.dupond@gouv.fr', telephone: '+33ZABPQMCDU' }
        ]
      }
    ]);
  });

  it('devrait avoir un nom', async () => {
    const permanence = {
      _id: 'abf48891b3f44bdf86bb7bc2601d3d5b',
      nomEnseigne: 'Anonymal',
      adresse: {
        ville: 'Reims',
        codePostal: '51100',
        numeroRue: '12 BIS',
        rue: 'RUE DE LECLERCQ'
      },
      structure: {
        _id: 'abc88891b3f44bdf86bb7bc2601d3ddd'
      },
      aidants: [
        { _id: 'aaa88891b3f44bdf86bb7bc2601d3fff', prenom: 'Jean', nom: 'Dupond', emailPro: 'jean.dupond@gouv.fr', telephonePro: '+33ZABPQMCDU' }
      ]
    };

    const lieux = await lieuxDeMediationNumerique({ getPermanences: () => [permanence] });

    expect(lieux).toStrictEqual([
      {
        id: 'abf48891b3f44bdf86bb7bc2601d3d5b',
        nom: 'Anonymal',
        commune: 'Reims',
        code_postal: '51100',
        adresse: '12 BIS RUE DE LECLERCQ',
        services: CNFS_COMMON_SERVICES,
        source: 'conseiller-numerique',
        conditions_access: 'Gratuit',
        labels_nationaux: 'CNFS',
        structureId: 'abc88891b3f44bdf86bb7bc2601d3ddd',
        aidants: [
          { aidantId: 'aaa88891b3f44bdf86bb7bc2601d3fff', nom: 'Jean Dupond', courriel: 'jean.dupond@gouv.fr', telephone: '+33ZABPQMCDU' }
        ]
      }
    ]);
  });

  it('devrait avoir un nom sans espaces superflus', async () => {
    const permanence = {
      _id: 'abf48891b3f44bdf86bb7bc2601d3d5b',
      nomEnseigne: ' Association  Anonymal  ',
      adresse: {
        ville: 'Reims',
        codePostal: '51100',
        numeroRue: '12 BIS',
        rue: 'RUE DE LECLERCQ'
      },
      structure: {
        _id: 'abc88891b3f44bdf86bb7bc2601d3ddd'
      },
      aidants: [
        { _id: 'aaa88891b3f44bdf86bb7bc2601d3fff', prenom: 'Jean', nom: 'Dupond', emailPro: 'jean.dupond@gouv.fr', telephonePro: '+33ZABPQMCDU' }
      ]
    };

    const lieux = await lieuxDeMediationNumerique({ getPermanences: () => [permanence] });

    expect(lieux).toStrictEqual([
      {
        id: 'abf48891b3f44bdf86bb7bc2601d3d5b',
        nom: 'Association Anonymal',
        commune: 'Reims',
        code_postal: '51100',
        adresse: '12 BIS RUE DE LECLERCQ',
        services: CNFS_COMMON_SERVICES,
        source: 'conseiller-numerique',
        conditions_access: 'Gratuit',
        labels_nationaux: 'CNFS',
        structureId: 'abc88891b3f44bdf86bb7bc2601d3ddd',
        aidants: [
          { aidantId: 'aaa88891b3f44bdf86bb7bc2601d3fff', nom: 'Jean Dupond', courriel: 'jean.dupond@gouv.fr', telephone: '+33ZABPQMCDU' }
        ]
      }
    ]);
  });

  it('devrait exclure les lieux dont le nom est null', async () => {
    const permanence = {
      _id: 'abf48891b3f44bdf86bb7bc2601d3d5b',
      nomEnseigne: null,
      adresse: {
        ville: 'Reims',
        codePostal: '51100',
        numeroRue: '12 BIS',
        rue: 'RUE DE LECLERCQ'
      },
      structure: {
        _id: 'abc88891b3f44bdf86bb7bc2601d3ddd'
      },
      aidants: [
        { _id: 'aaa88891b3f44bdf86bb7bc2601d3fff', prenom: 'Jean', nom: 'Dupond', emailPro: 'jean.dupond@gouv.fr', telephonePro: '+33ZABPQMCDU' }
      ]
    };

    const lieux = await lieuxDeMediationNumerique({ getPermanences: () => [permanence] });

    expect(lieux).toStrictEqual([]);
  });

  it('devrait exclure les lieux dont le nom est vide', async () => {
    const permanence = {
      _id: 'abf48891b3f44bdf86bb7bc2601d3d5b',
      nomEnseigne: '',
      adresse: {
        ville: 'Reims',
        codePostal: '51100',
        numeroRue: '12 BIS',
        rue: 'RUE DE LECLERCQ'
      },
      structure: {
        _id: 'abc88891b3f44bdf86bb7bc2601d3ddd'
      },
      aidants: [
        { _id: 'aaa88891b3f44bdf86bb7bc2601d3fff', prenom: 'Jean', nom: 'Dupond', emailPro: 'jean.dupond@gouv.fr', telephonePro: '+33ZABPQMCDU' }
      ]
    };

    const lieux = await lieuxDeMediationNumerique({ getPermanences: () => [permanence] });

    expect(lieux).toStrictEqual([]);
  });

  it('devrait exclure les lieux dont l\'id structure n\'est pas renseignée', async () => {
    const permanence = {
      _id: 'abf48891b3f44bdf86bb7bc2601d3d5b',
      nomEnseigne: '',
      adresse: {
        ville: 'Reims',
        codePostal: '51100',
        numeroRue: '12 BIS',
        rue: 'RUE DE LECLERCQ'
      },
      aidants: [
        { _id: 'aaa88891b3f44bdf86bb7bc2601d3fff', prenom: 'Jean', nom: 'Dupond', emailPro: 'jean.dupond@gouv.fr', telephonePro: '+33ZABPQMCDU' }
      ]
    };

    const lieux = await lieuxDeMediationNumerique({ getPermanences: () => [permanence] });

    expect(lieux).toStrictEqual([]);
  });

  it('devrait avoir une commune', async () => {
    const permanence = {
      _id: 'abf48891b3f44bdf86bb7bc2601d3d5b',
      nomEnseigne: 'Anonymal',
      adresse: {
        ville: 'Reims',
        codePostal: '51100',
        numeroRue: '12 BIS',
        rue: 'RUE DE LECLERCQ'
      },
      structure: {
        _id: 'abc88891b3f44bdf86bb7bc2601d3ddd'
      },
      aidants: [
        { _id: 'aaa88891b3f44bdf86bb7bc2601d3fff', prenom: 'Jean', nom: 'Dupond', emailPro: 'jean.dupond@gouv.fr', telephonePro: '+33ZABPQMCDU' }
      ]
    };

    const lieux = await lieuxDeMediationNumerique({ getPermanences: () => [permanence] });

    expect(lieux).toStrictEqual([
      {
        id: 'abf48891b3f44bdf86bb7bc2601d3d5b',
        nom: 'Anonymal',
        commune: 'Reims',
        code_postal: '51100',
        adresse: '12 BIS RUE DE LECLERCQ',
        services: CNFS_COMMON_SERVICES,
        source: 'conseiller-numerique',
        conditions_access: 'Gratuit',
        labels_nationaux: 'CNFS',
        structureId: 'abc88891b3f44bdf86bb7bc2601d3ddd',
        aidants: [
          { aidantId: 'aaa88891b3f44bdf86bb7bc2601d3fff', nom: 'Jean Dupond', courriel: 'jean.dupond@gouv.fr', telephone: '+33ZABPQMCDU' }
        ]
      }
    ]);
  });

  it('devrait avoir une commune sans espaces superflus', async () => {
    const permanence = {
      _id: 'abf48891b3f44bdf86bb7bc2601d3d5b',
      nomEnseigne: 'Anonymal',
      adresse: {
        ville: ' Villeneuve  sur Eure  ',
        codePostal: '51100',
        numeroRue: '12 BIS',
        rue: 'RUE DE LECLERCQ'
      },
      structure: {
        _id: 'abc88891b3f44bdf86bb7bc2601d3ddd'
      },
      aidants: [
        { _id: 'aaa88891b3f44bdf86bb7bc2601d3fff', prenom: 'Jean', nom: 'Dupond', emailPro: 'jean.dupond@gouv.fr', telephonePro: '+33ZABPQMCDU' }
      ]
    };

    const lieux = await lieuxDeMediationNumerique({ getPermanences: () => [permanence] });

    expect(lieux).toStrictEqual([
      {
        id: 'abf48891b3f44bdf86bb7bc2601d3d5b',
        nom: 'Anonymal',
        commune: 'Villeneuve sur Eure',
        code_postal: '51100',
        adresse: '12 BIS RUE DE LECLERCQ',
        services: CNFS_COMMON_SERVICES,
        source: 'conseiller-numerique',
        conditions_access: 'Gratuit',
        labels_nationaux: 'CNFS',
        structureId: 'abc88891b3f44bdf86bb7bc2601d3ddd',
        aidants: [
          { aidantId: 'aaa88891b3f44bdf86bb7bc2601d3fff', nom: 'Jean Dupond', courriel: 'jean.dupond@gouv.fr', telephone: '+33ZABPQMCDU' }
        ]
      }
    ]);
  });

  it('devrait avoir un code postal', async () => {
    const permanence = {
      _id: 'abf48891b3f44bdf86bb7bc2601d3d5b',
      nomEnseigne: 'Anonymal',
      adresse: {
        ville: 'Reims',
        codePostal: '51100',
        numeroRue: '12 BIS',
        rue: 'RUE DE LECLERCQ'
      },
      structure: {
        _id: 'abc88891b3f44bdf86bb7bc2601d3ddd'
      },
      aidants: [
        { _id: 'aaa88891b3f44bdf86bb7bc2601d3fff', prenom: 'Jean', nom: 'Dupond', emailPro: 'jean.dupond@gouv.fr', telephonePro: '+33ZABPQMCDU' }
      ]
    };

    const lieux = await lieuxDeMediationNumerique({ getPermanences: () => [permanence] });

    expect(lieux).toStrictEqual([
      {
        id: 'abf48891b3f44bdf86bb7bc2601d3d5b',
        nom: 'Anonymal',
        commune: 'Reims',
        code_postal: '51100',
        adresse: '12 BIS RUE DE LECLERCQ',
        services: CNFS_COMMON_SERVICES,
        source: 'conseiller-numerique',
        conditions_access: 'Gratuit',
        labels_nationaux: 'CNFS',
        structureId: 'abc88891b3f44bdf86bb7bc2601d3ddd',
        aidants: [
          { aidantId: 'aaa88891b3f44bdf86bb7bc2601d3fff', nom: 'Jean Dupond', courriel: 'jean.dupond@gouv.fr', telephone: '+33ZABPQMCDU' }
        ]
      }
    ]);
  });

  it('devrait avoir un code postal sans espaces', async () => {
    const permanence = {
      _id: 'abf48891b3f44bdf86bb7bc2601d3d5b',
      nomEnseigne: 'Anonymal',
      adresse: {
        ville: 'Reims',
        codePostal: '51 100',
        numeroRue: '12 BIS',
        rue: 'RUE DE LECLERCQ'
      },
      structure: {
        _id: 'abc88891b3f44bdf86bb7bc2601d3ddd'
      },
      aidants: [
        { _id: 'aaa88891b3f44bdf86bb7bc2601d3fff', prenom: 'Jean', nom: 'Dupond', emailPro: 'jean.dupond@gouv.fr', telephonePro: '+33ZABPQMCDU' }
      ]
    };

    const lieux = await lieuxDeMediationNumerique({ getPermanences: () => [permanence] });

    expect(lieux).toStrictEqual([
      {
        id: 'abf48891b3f44bdf86bb7bc2601d3d5b',
        nom: 'Anonymal',
        commune: 'Reims',
        code_postal: '51100',
        adresse: '12 BIS RUE DE LECLERCQ',
        services: CNFS_COMMON_SERVICES,
        source: 'conseiller-numerique',
        conditions_access: 'Gratuit',
        labels_nationaux: 'CNFS',
        structureId: 'abc88891b3f44bdf86bb7bc2601d3ddd',
        aidants: [
          { aidantId: 'aaa88891b3f44bdf86bb7bc2601d3fff', nom: 'Jean Dupond', courriel: 'jean.dupond@gouv.fr', telephone: '+33ZABPQMCDU' }
        ]
      }
    ]);
  });

  it('devrait filtrer les codes postaux nuls', async () => {
    const permanence = {
      _id: 'abf48891b3f44bdf86bb7bc2601d3d5b',
      nomEnseigne: 'Anonymal',
      adresse: {
        ville: 'Reims',
        codePostal: null,
        numeroRue: '12 BIS',
        rue: 'RUE DE LECLERCQ'
      },
      structure: {
        _id: 'abc88891b3f44bdf86bb7bc2601d3ddd'
      },
      aidants: [
        { _id: 'aaa88891b3f44bdf86bb7bc2601d3fff', prenom: 'Jean', nom: 'Dupond', emailPro: 'jean.dupond@gouv.fr', telephonePro: '+33ZABPQMCDU' }
      ]
    };

    const lieux = await lieuxDeMediationNumerique({ getPermanences: () => [permanence] });

    expect(lieux).toStrictEqual([]);
  });

  it('devrait filtrer les codes postaux vides', async () => {
    const permanence = {
      _id: 'abf48891b3f44bdf86bb7bc2601d3d5b',
      nomEnseigne: 'Anonymal',
      adresse: {
        ville: 'Reims',
        codePostal: '',
        numeroRue: '12 BIS',
        rue: 'RUE DE LECLERCQ'
      },
      structure: {
        _id: 'abc88891b3f44bdf86bb7bc2601d3ddd'
      },
      aidants: [
        { nom: 'Jean Dupond', courriel: 'jean.dupond@gouv.fr', telephone: '+33ZABPQMCDU' }
      ]
    };

    const lieux = await lieuxDeMediationNumerique({ getPermanences: () => [permanence] });

    expect(lieux).toStrictEqual([]);
  });

  it('devrait avoir un code INSEE', async () => {
    const permanence = {
      _id: 'abf48891b3f44bdf86bb7bc2601d3d5b',
      nomEnseigne: 'Anonymal',
      adresse: {
        ville: 'Reims',
        codePostal: '51100',
        numeroRue: '12 BIS',
        rue: 'RUE DE LECLERCQ'
      },
      structure: {
        _id: 'abc88891b3f44bdf86bb7bc2601d3ddd'
      },
      aidants: [
        { _id: 'aaa88891b3f44bdf86bb7bc2601d3fff', prenom: 'Jean', nom: 'Dupond', emailPro: 'jean.dupond@gouv.fr', telephonePro: '+33ZABPQMCDU' }
      ]
    };

    const lieux = await lieuxDeMediationNumerique({ getPermanences: () => [permanence] });

    expect(lieux).toStrictEqual([
      {
        id: 'abf48891b3f44bdf86bb7bc2601d3d5b',
        nom: 'Anonymal',
        commune: 'Reims',
        code_postal: '51100',
        adresse: '12 BIS RUE DE LECLERCQ',
        services: CNFS_COMMON_SERVICES,
        source: 'conseiller-numerique',
        conditions_access: 'Gratuit',
        labels_nationaux: 'CNFS',
        structureId: 'abc88891b3f44bdf86bb7bc2601d3ddd',
        aidants: [
          { aidantId: 'aaa88891b3f44bdf86bb7bc2601d3fff', nom: 'Jean Dupond', courriel: 'jean.dupond@gouv.fr', telephone: '+33ZABPQMCDU' }
        ]
      }
    ]);
  });

  it('devrait avoir une adresse', async () => {
    const permanence = {
      _id: 'abf48891b3f44bdf86bb7bc2601d3d5b',
      nomEnseigne: 'Anonymal',
      adresse: {
        ville: 'Reims',
        codePostal: '51100',
        numeroRue: '12 BIS',
        rue: 'RUE DE LECLERCQ'
      },
      structure: {
        _id: 'abc88891b3f44bdf86bb7bc2601d3ddd'
      },
      aidants: [
        { _id: 'aaa88891b3f44bdf86bb7bc2601d3fff', prenom: 'Jean', nom: 'Dupond', emailPro: 'jean.dupond@gouv.fr', telephonePro: '+33ZABPQMCDU' }
      ]
    };

    const lieux = await lieuxDeMediationNumerique({ getPermanences: () => [permanence] });

    expect(lieux).toStrictEqual([
      {
        id: 'abf48891b3f44bdf86bb7bc2601d3d5b',
        nom: 'Anonymal',
        commune: 'Reims',
        code_postal: '51100',
        adresse: '12 BIS RUE DE LECLERCQ',
        services: CNFS_COMMON_SERVICES,
        source: 'conseiller-numerique',
        conditions_access: 'Gratuit',
        labels_nationaux: 'CNFS',
        structureId: 'abc88891b3f44bdf86bb7bc2601d3ddd',
        aidants: [
          { aidantId: 'aaa88891b3f44bdf86bb7bc2601d3fff', nom: 'Jean Dupond', courriel: 'jean.dupond@gouv.fr', telephone: '+33ZABPQMCDU' }
        ]
      }
    ]);
  });

  it('devrait avoir une adresse sans espaces superflus', async () => {
    const permanence = {
      _id: 'abf48891b3f44bdf86bb7bc2601d3d5b',
      nomEnseigne: 'Anonymal',
      adresse: {
        ville: 'Reims',
        codePostal: '51100',
        numeroRue: ' 12  BIS ',
        rue: '  RUE DE  LECLERCQ '
      },
      structure: {
        _id: 'abc88891b3f44bdf86bb7bc2601d3ddd'
      },
      aidants: [
        { _id: 'aaa88891b3f44bdf86bb7bc2601d3fff', prenom: 'Jean', nom: 'Dupond', emailPro: 'jean.dupond@gouv.fr', telephonePro: '+33ZABPQMCDU' }
      ]
    };

    const lieux = await lieuxDeMediationNumerique({ getPermanences: () => [permanence] });

    expect(lieux).toStrictEqual([
      {
        id: 'abf48891b3f44bdf86bb7bc2601d3d5b',
        nom: 'Anonymal',
        commune: 'Reims',
        code_postal: '51100',
        adresse: '12 BIS RUE DE LECLERCQ',
        services: CNFS_COMMON_SERVICES,
        source: 'conseiller-numerique',
        conditions_access: 'Gratuit',
        labels_nationaux: 'CNFS',
        structureId: 'abc88891b3f44bdf86bb7bc2601d3ddd',
        aidants: [
          { aidantId: 'aaa88891b3f44bdf86bb7bc2601d3fff', nom: 'Jean Dupond', courriel: 'jean.dupond@gouv.fr', telephone: '+33ZABPQMCDU' }
        ]
      }
    ]);
  });

  it('devrait avoir une adresse sans le motif "null "', async () => {
    const permanence = {
      _id: 'abf48891b3f44bdf86bb7bc2601d3d5b',
      nomEnseigne: 'Anonymal',
      adresse: {
        ville: 'Reims',
        codePostal: '51100',
        numeroRue: ' 12 null',
        rue: '  RUE DE LECLERCQ '
      },
      structure: {
        _id: 'abc88891b3f44bdf86bb7bc2601d3ddd'
      },
      aidants: [
        { _id: 'aaa88891b3f44bdf86bb7bc2601d3fff', prenom: 'Jean', nom: 'Dupond', emailPro: 'jean.dupond@gouv.fr', telephonePro: '+33ZABPQMCDU' }
      ]
    };

    const lieux = await lieuxDeMediationNumerique({ getPermanences: () => [permanence] });

    expect(lieux).toStrictEqual([
      {
        id: 'abf48891b3f44bdf86bb7bc2601d3d5b',
        nom: 'Anonymal',
        commune: 'Reims',
        code_postal: '51100',
        adresse: '12 RUE DE LECLERCQ',
        services: CNFS_COMMON_SERVICES,
        source: 'conseiller-numerique',
        conditions_access: 'Gratuit',
        labels_nationaux: 'CNFS',
        structureId: 'abc88891b3f44bdf86bb7bc2601d3ddd',
        aidants: [
          { aidantId: 'aaa88891b3f44bdf86bb7bc2601d3fff', nom: 'Jean Dupond', courriel: 'jean.dupond@gouv.fr', telephone: '+33ZABPQMCDU' }
        ]
      }
    ]);
  });

  it('devrait avoir une adresse sans le motif "null null"', async () => {
    const permanence = {
      _id: 'abf48891b3f44bdf86bb7bc2601d3d5b',
      nomEnseigne: 'Anonymal',
      adresse: {
        ville: 'Reims',
        codePostal: '51100',
        numeroRue: 'null',
        rue: 'null'
      },
      structure: {
        _id: 'abc88891b3f44bdf86bb7bc2601d3ddd'
      },
      aidants: [
        { _id: 'aaa88891b3f44bdf86bb7bc2601d3fff', prenom: 'Jean', nom: 'Dupond', emailPro: 'jean.dupond@gouv.fr', telephonePro: '+33ZABPQMCDU' }
      ]
    };

    const lieux = await lieuxDeMediationNumerique({ getPermanences: () => [permanence] });

    expect(lieux).toStrictEqual([]);
  });

  it('devrait filtrer une adresse dont la voie et le numéro de rue sont nuls', async () => {
    const permanence = {
      _id: 'abf48891b3f44bdf86bb7bc2601d3d5b',
      nomEnseigne: 'Anonymal',
      adresse: {
        ville: 'Reims',
        codePostal: '51100',
        numeroRue: null,
        rue: null
      },
      structure: {
        _id: 'abc88891b3f44bdf86bb7bc2601d3ddd'
      },
      aidants: [
        { _id: 'aaa88891b3f44bdf86bb7bc2601d3fff', prenom: 'Jean', nom: 'Dupond', emailPro: 'jean.dupond@gouv.fr', telephonePro: '+33ZABPQMCDU' }
      ]
    };

    const lieux = await lieuxDeMediationNumerique({ getPermanences: () => [permanence] });

    expect(lieux).toStrictEqual([]);
  });

  it('devrait avoir une latitude et une longitude', async () => {
    const permanence = {
      _id: 'abf48891b3f44bdf86bb7bc2601d3d5b',
      nomEnseigne: 'Anonymal',
      adresse: {
        ville: 'Reims',
        codePostal: '51100',
        numeroRue: '12 BIS',
        rue: 'RUE DE LECLERCQ'
      },
      location: {
        coordinates: [
          5.41423,
          43.52609
        ]
      },
      structure: {
        _id: 'abc88891b3f44bdf86bb7bc2601d3ddd'
      },
      aidants: [
        { _id: 'aaa88891b3f44bdf86bb7bc2601d3fff', prenom: 'Jean', nom: 'Dupond', emailPro: 'jean.dupond@gouv.fr', telephonePro: '+33ZABPQMCDU' }
      ]
    };

    const lieux = await lieuxDeMediationNumerique({ getPermanences: () => [permanence] });

    expect(lieux).toStrictEqual([
      {
        id: 'abf48891b3f44bdf86bb7bc2601d3d5b',
        nom: 'Anonymal',
        commune: 'Reims',
        code_postal: '51100',
        adresse: '12 BIS RUE DE LECLERCQ',
        services: CNFS_COMMON_SERVICES,
        latitude: 43.52609,
        longitude: 5.41423,
        source: 'conseiller-numerique',
        conditions_access: 'Gratuit',
        labels_nationaux: 'CNFS',
        structureId: 'abc88891b3f44bdf86bb7bc2601d3ddd',
        aidants: [
          { aidantId: 'aaa88891b3f44bdf86bb7bc2601d3fff', nom: 'Jean Dupond', courriel: 'jean.dupond@gouv.fr', telephone: '+33ZABPQMCDU' }
        ]
      }
    ]);
  });

  it('devrait avoir un numéro de téléphone', async () => {
    const permanence = {
      _id: 'abf48891b3f44bdf86bb7bc2601d3d5b',
      nomEnseigne: 'Anonymal',
      adresse: {
        ville: 'Reims',
        codePostal: '51100',
        numeroRue: '12 BIS',
        rue: 'RUE DE LECLERCQ'
      },
      numeroTelephone: '+33180059880',
      structure: {
        _id: 'abc88891b3f44bdf86bb7bc2601d3ddd'
      },
      aidants: [
        { _id: 'aaa88891b3f44bdf86bb7bc2601d3fff', prenom: 'Jean', nom: 'Dupond', emailPro: 'jean.dupond@gouv.fr', telephonePro: '+33ZABPQMCDU' }
      ]
    };

    const lieux = await lieuxDeMediationNumerique({ getPermanences: () => [permanence] });

    expect(lieux).toStrictEqual([
      {
        id: 'abf48891b3f44bdf86bb7bc2601d3d5b',
        nom: 'Anonymal',
        commune: 'Reims',
        code_postal: '51100',
        adresse: '12 BIS RUE DE LECLERCQ',
        services: CNFS_COMMON_SERVICES,
        telephone: '+33180059880',
        source: 'conseiller-numerique',
        conditions_access: 'Gratuit',
        labels_nationaux: 'CNFS',
        structureId: 'abc88891b3f44bdf86bb7bc2601d3ddd',
        aidants: [
          { aidantId: 'aaa88891b3f44bdf86bb7bc2601d3fff', nom: 'Jean Dupond', courriel: 'jean.dupond@gouv.fr', telephone: '+33ZABPQMCDU' }
        ]
      }
    ]);
  });

  it('devrait avoir un numéro de téléphone sans espaces', async () => {
    const permanence = {
      _id: 'abf48891b3f44bdf86bb7bc2601d3d5b',
      nomEnseigne: 'Anonymal',
      adresse: {
        ville: 'Reims',
        codePostal: '51100',
        numeroRue: '12 BIS',
        rue: 'RUE DE LECLERCQ'
      },
      numeroTelephone: ' +33 1 80 05 98 80 ',
      structure: {
        _id: 'abc88891b3f44bdf86bb7bc2601d3ddd'
      },
      aidants: [
        { _id: 'aaa88891b3f44bdf86bb7bc2601d3fff', prenom: 'Jean', nom: 'Dupond', emailPro: 'jean.dupond@gouv.fr', telephonePro: '+33ZABPQMCDU' }
      ]
    };

    const lieux = await lieuxDeMediationNumerique({ getPermanences: () => [permanence] });

    expect(lieux).toStrictEqual([
      {
        id: 'abf48891b3f44bdf86bb7bc2601d3d5b',
        nom: 'Anonymal',
        commune: 'Reims',
        code_postal: '51100',
        adresse: '12 BIS RUE DE LECLERCQ',
        services: CNFS_COMMON_SERVICES,
        telephone: '+33180059880',
        source: 'conseiller-numerique',
        conditions_access: 'Gratuit',
        labels_nationaux: 'CNFS',
        structureId: 'abc88891b3f44bdf86bb7bc2601d3ddd',
        aidants: [
          { aidantId: 'aaa88891b3f44bdf86bb7bc2601d3fff', nom: 'Jean Dupond', courriel: 'jean.dupond@gouv.fr', telephone: '+33ZABPQMCDU' }
        ]
      }
    ]);
  });

  it('devrait avoir un numéro de téléphone sans points', async () => {
    const permanence = {
      _id: 'abf48891b3f44bdf86bb7bc2601d3d5b',
      nomEnseigne: 'Anonymal',
      adresse: {
        ville: 'Reims',
        codePostal: '51100',
        numeroRue: '12 BIS',
        rue: 'RUE DE LECLERCQ'
      },
      numeroTelephone: '+33.1.80.05.98.80',
      structure: {
        _id: 'abc88891b3f44bdf86bb7bc2601d3ddd'
      },
      aidants: [
        { _id: 'aaa88891b3f44bdf86bb7bc2601d3fff', prenom: 'Jean', nom: 'Dupond', emailPro: 'jean.dupond@gouv.fr', telephonePro: '+33ZABPQMCDU' }
      ]
    };

    const lieux = await lieuxDeMediationNumerique({ getPermanences: () => [permanence] });

    expect(lieux).toStrictEqual([
      {
        id: 'abf48891b3f44bdf86bb7bc2601d3d5b',
        nom: 'Anonymal',
        commune: 'Reims',
        code_postal: '51100',
        adresse: '12 BIS RUE DE LECLERCQ',
        services: CNFS_COMMON_SERVICES,
        telephone: '+33180059880',
        source: 'conseiller-numerique',
        conditions_access: 'Gratuit',
        labels_nationaux: 'CNFS',
        structureId: 'abc88891b3f44bdf86bb7bc2601d3ddd',
        aidants: [
          { aidantId: 'aaa88891b3f44bdf86bb7bc2601d3fff', nom: 'Jean Dupond', courriel: 'jean.dupond@gouv.fr', telephone: '+33ZABPQMCDU' }
        ]
      }
    ]);
  });

  it('devrait avoir un numéro de téléphone avec indicatif international sans 0 supplémentaire', async () => {
    const permanence = {
      _id: 'abf48891b3f44bdf86bb7bc2601d3d5b',
      nomEnseigne: 'Anonymal',
      adresse: {
        ville: 'Reims',
        codePostal: '51100',
        numeroRue: '12 BIS',
        rue: 'RUE DE LECLERCQ'
      },
      numeroTelephone: '+330562636539',
      structure: {
        _id: 'abc88891b3f44bdf86bb7bc2601d3ddd'
      },
      aidants: [
        { _id: 'aaa88891b3f44bdf86bb7bc2601d3fff', prenom: 'Jean', nom: 'Dupond', emailPro: 'jean.dupond@gouv.fr', telephonePro: '+33ZABPQMCDU' }
      ]
    };

    const lieux = await lieuxDeMediationNumerique({ getPermanences: () => [permanence] });

    expect(lieux).toStrictEqual([
      {
        id: 'abf48891b3f44bdf86bb7bc2601d3d5b',
        nom: 'Anonymal',
        commune: 'Reims',
        code_postal: '51100',
        adresse: '12 BIS RUE DE LECLERCQ',
        services: CNFS_COMMON_SERVICES,
        telephone: '+33562636539',
        source: 'conseiller-numerique',
        conditions_access: 'Gratuit',
        labels_nationaux: 'CNFS',
        structureId: 'abc88891b3f44bdf86bb7bc2601d3ddd',
        aidants: [
          { aidantId: 'aaa88891b3f44bdf86bb7bc2601d3fff', nom: 'Jean Dupond', courriel: 'jean.dupond@gouv.fr', telephone: '+33ZABPQMCDU' }
        ]
      }
    ]);
  });

  it('devrait avoir une adresse email', async () => {
    const permanence = {
      _id: 'abf48891b3f44bdf86bb7bc2601d3d5b',
      nomEnseigne: 'Anonymal',
      adresse: {
        ville: 'Reims',
        codePostal: '51100',
        numeroRue: '12 BIS',
        rue: 'RUE DE LECLERCQ'
      },
      email: 'contact@laquincaillerie.tl',
      structure: {
        _id: 'abc88891b3f44bdf86bb7bc2601d3ddd'
      },
      aidants: [
        { _id: 'aaa88891b3f44bdf86bb7bc2601d3fff', prenom: 'Jean', nom: 'Dupond', emailPro: 'jean.dupond@gouv.fr', telephonePro: '+33ZABPQMCDU' }
      ]
    };

    const lieux = await lieuxDeMediationNumerique({ getPermanences: () => [permanence] });

    expect(lieux).toStrictEqual([
      {
        id: 'abf48891b3f44bdf86bb7bc2601d3d5b',
        nom: 'Anonymal',
        commune: 'Reims',
        code_postal: '51100',
        adresse: '12 BIS RUE DE LECLERCQ',
        services: CNFS_COMMON_SERVICES,
        courriel: 'contact@laquincaillerie.tl',
        source: 'conseiller-numerique',
        conditions_access: 'Gratuit',
        labels_nationaux: 'CNFS',
        structureId: 'abc88891b3f44bdf86bb7bc2601d3ddd',
        aidants: [
          { aidantId: 'aaa88891b3f44bdf86bb7bc2601d3fff', nom: 'Jean Dupond', courriel: 'jean.dupond@gouv.fr', telephone: '+33ZABPQMCDU' }
        ]
      }
    ]);
  });

  it('devrait avoir une adresse email sans espaces', async () => {
    const permanence = {
      _id: 'abf48891b3f44bdf86bb7bc2601d3d5b',
      nomEnseigne: 'Anonymal',
      adresse: {
        ville: 'Reims',
        codePostal: '51100',
        numeroRue: '12 BIS',
        rue: 'RUE DE LECLERCQ'
      },
      email: ' contact@laquincaillerie.tl   ',
      structure: {
        _id: 'abc88891b3f44bdf86bb7bc2601d3ddd'
      },
      aidants: [
        { _id: 'aaa88891b3f44bdf86bb7bc2601d3fff', prenom: 'Jean', nom: 'Dupond', emailPro: 'jean.dupond@gouv.fr', telephonePro: '+33ZABPQMCDU' }
      ]
    };

    const lieux = await lieuxDeMediationNumerique({ getPermanences: () => [permanence] });

    expect(lieux).toStrictEqual([
      {
        id: 'abf48891b3f44bdf86bb7bc2601d3d5b',
        nom: 'Anonymal',
        commune: 'Reims',
        code_postal: '51100',
        adresse: '12 BIS RUE DE LECLERCQ',
        services: CNFS_COMMON_SERVICES,
        courriel: 'contact@laquincaillerie.tl',
        source: 'conseiller-numerique',
        conditions_access: 'Gratuit',
        labels_nationaux: 'CNFS',
        structureId: 'abc88891b3f44bdf86bb7bc2601d3ddd',
        aidants: [
          { aidantId: 'aaa88891b3f44bdf86bb7bc2601d3fff', nom: 'Jean Dupond', courriel: 'jean.dupond@gouv.fr', telephone: '+33ZABPQMCDU' }
        ]
      }
    ]);
  });

  it('devrait avoir un site web', async () => {
    const permanence = {
      _id: 'abf48891b3f44bdf86bb7bc2601d3d5b',
      nomEnseigne: 'Anonymal',
      adresse: {
        ville: 'Reims',
        codePostal: '51100',
        numeroRue: '12 BIS',
        rue: 'RUE DE LECLERCQ'
      },
      siteWeb: 'https://www.laquincaillerie.tl/',
      structure: {
        _id: 'abc88891b3f44bdf86bb7bc2601d3ddd'
      },
      aidants: [
        { _id: 'aaa88891b3f44bdf86bb7bc2601d3fff', prenom: 'Jean', nom: 'Dupond', emailPro: 'jean.dupond@gouv.fr', telephonePro: '+33ZABPQMCDU' }
      ]
    };

    const lieux = await lieuxDeMediationNumerique({ getPermanences: () => [permanence] });

    expect(lieux).toStrictEqual([
      {
        id: 'abf48891b3f44bdf86bb7bc2601d3d5b',
        nom: 'Anonymal',
        commune: 'Reims',
        code_postal: '51100',
        adresse: '12 BIS RUE DE LECLERCQ',
        services: CNFS_COMMON_SERVICES,
        site_web: 'https://www.laquincaillerie.tl/',
        source: 'conseiller-numerique',
        conditions_access: 'Gratuit',
        labels_nationaux: 'CNFS',
        structureId: 'abc88891b3f44bdf86bb7bc2601d3ddd',
        aidants: [
          { aidantId: 'aaa88891b3f44bdf86bb7bc2601d3fff', nom: 'Jean Dupond', courriel: 'jean.dupond@gouv.fr', telephone: '+33ZABPQMCDU' }
        ]
      }
    ]);
  });

  it('devrait avoir un site web avec un préfix https', async () => {
    const permanence = {
      _id: 'abf48891b3f44bdf86bb7bc2601d3d5b',
      nomEnseigne: 'Anonymal',
      adresse: {
        ville: 'Reims',
        codePostal: '51100',
        numeroRue: '12 BIS',
        rue: 'RUE DE LECLERCQ'
      },
      siteWeb: 'www.laquincaillerie.tl/',
      structure: {
        _id: 'abc88891b3f44bdf86bb7bc2601d3ddd'
      },
      aidants: [
        { _id: 'aaa88891b3f44bdf86bb7bc2601d3fff', prenom: 'Jean', nom: 'Dupond', emailPro: 'jean.dupond@gouv.fr', telephonePro: '+33ZABPQMCDU' }
      ]
    };

    const lieux = await lieuxDeMediationNumerique({ getPermanences: () => [permanence] });

    expect(lieux).toStrictEqual([
      {
        id: 'abf48891b3f44bdf86bb7bc2601d3d5b',
        nom: 'Anonymal',
        commune: 'Reims',
        code_postal: '51100',
        adresse: '12 BIS RUE DE LECLERCQ',
        services: CNFS_COMMON_SERVICES,
        site_web: 'https://www.laquincaillerie.tl/',
        source: 'conseiller-numerique',
        conditions_access: 'Gratuit',
        labels_nationaux: 'CNFS',
        structureId: 'abc88891b3f44bdf86bb7bc2601d3ddd',
        aidants: [
          { aidantId: 'aaa88891b3f44bdf86bb7bc2601d3fff', nom: 'Jean Dupond', courriel: 'jean.dupond@gouv.fr', telephone: '+33ZABPQMCDU' }
        ]
      }
    ]);
  });

  it('devrait avoir un site web sans espaces', async () => {
    const permanence = {
      _id: 'abf48891b3f44bdf86bb7bc2601d3d5b',
      nomEnseigne: 'Anonymal',
      adresse: {
        ville: 'Reims',
        codePostal: '51100',
        numeroRue: '12 BIS',
        rue: 'RUE DE LECLERCQ'
      },
      siteWeb: '  https://  www.laquincaillerie.tl/  ',
      structure: {
        _id: 'abc88891b3f44bdf86bb7bc2601d3ddd'
      },
      aidants: [
        { _id: 'aaa88891b3f44bdf86bb7bc2601d3fff', prenom: 'Jean', nom: 'Dupond', emailPro: 'jean.dupond@gouv.fr', telephonePro: '+33ZABPQMCDU' }
      ]
    };

    const lieux = await lieuxDeMediationNumerique({ getPermanences: () => [permanence] });

    expect(lieux).toStrictEqual([
      {
        id: 'abf48891b3f44bdf86bb7bc2601d3d5b',
        nom: 'Anonymal',
        commune: 'Reims',
        code_postal: '51100',
        adresse: '12 BIS RUE DE LECLERCQ',
        services: CNFS_COMMON_SERVICES,
        site_web: 'https://www.laquincaillerie.tl/',
        source: 'conseiller-numerique',
        conditions_access: 'Gratuit',
        labels_nationaux: 'CNFS',
        structureId: 'abc88891b3f44bdf86bb7bc2601d3ddd',
        aidants: [
          { aidantId: 'aaa88891b3f44bdf86bb7bc2601d3fff', nom: 'Jean Dupond', courriel: 'jean.dupond@gouv.fr', telephone: '+33ZABPQMCDU' }
        ]
      }
    ]);
  });

  it('devrait avoir un site web avec un seul préfixe http(s)://', async () => {
    const permanence = {
      _id: 'abf48891b3f44bdf86bb7bc2601d3d5b',
      nomEnseigne: 'Anonymal',
      adresse: {
        ville: 'Reims',
        codePostal: '51100',
        numeroRue: '12 BIS',
        rue: 'RUE DE LECLERCQ'
      },
      siteWeb: 'https://www.https://www.laquincaillerie.tl/',
      structure: {
        _id: 'abc88891b3f44bdf86bb7bc2601d3ddd'
      },
      aidants: [
        { _id: 'aaa88891b3f44bdf86bb7bc2601d3fff', prenom: 'Jean', nom: 'Dupond', emailPro: 'jean.dupond@gouv.fr', telephonePro: '+33ZABPQMCDU' }
      ]
    };

    const lieux = await lieuxDeMediationNumerique({ getPermanences: () => [permanence] });

    expect(lieux).toStrictEqual([
      {
        id: 'abf48891b3f44bdf86bb7bc2601d3d5b',
        nom: 'Anonymal',
        commune: 'Reims',
        code_postal: '51100',
        adresse: '12 BIS RUE DE LECLERCQ',
        services: CNFS_COMMON_SERVICES,
        site_web: 'https://www.laquincaillerie.tl/',
        source: 'conseiller-numerique',
        conditions_access: 'Gratuit',
        labels_nationaux: 'CNFS',
        structureId: 'abc88891b3f44bdf86bb7bc2601d3ddd',
        aidants: [
          { aidantId: 'aaa88891b3f44bdf86bb7bc2601d3fff', nom: 'Jean Dupond', courriel: 'jean.dupond@gouv.fr', telephone: '+33ZABPQMCDU' }
        ]
      }
    ]);
  });

  it('devrait convertir les horaires au format OSM pour une permanence qui ouvre tous les jours à des heures différentes', async () => {
    const permanence = {
      _id: 'abf48891b3f44bdf86bb7bc2601d3d5b',
      nomEnseigne: 'Anonymal',
      adresse: {
        ville: 'Reims',
        codePostal: '51100',
        numeroRue: '12 BIS',
        rue: 'RUE DE LECLERCQ'
      },
      horaires: [
        {
          matin: [
            '09:30',
            '10:45'
          ],
          apresMidi: [
            'Fermé',
            'Fermé'
          ]
        },
        {
          matin: [
            '11:15',
            '12:45'
          ],
          apresMidi: [
            'Fermé',
            'Fermé'
          ]
        },
        {
          matin: [
            'Fermé',
            'Fermé'
          ],
          apresMidi: [
            '13:30',
            '14:25'
          ]
        },
        {
          matin: [
            '8:00',
            '9:25'
          ],
          apresMidi: [
            '15:00',
            '16:05'
          ]
        },
        {
          matin: [
            'Fermé',
            'Fermé'
          ],
          apresMidi: [
            '16:20',
            '17:15'
          ]
        },
        {
          matin: [
            'Fermé',
            'Fermé'
          ],
          apresMidi: [
            '18:30',
            '19:00'
          ]
        },
        {
          matin: [
            'Fermé',
            'Fermé'
          ],
          apresMidi: [
            '19:50',
            '23:55'
          ]
        }
      ],
      structure: {
        _id: 'abc88891b3f44bdf86bb7bc2601d3ddd'
      },
      aidants: [
        { _id: 'aaa88891b3f44bdf86bb7bc2601d3fff', prenom: 'Jean', nom: 'Dupond', emailPro: 'jean.dupond@gouv.fr', telephonePro: '+33ZABPQMCDU' }
      ]
    };

    const lieux = await lieuxDeMediationNumerique({ getPermanences: () => [permanence] });

    expect(lieux).toStrictEqual([
      {
        id: 'abf48891b3f44bdf86bb7bc2601d3d5b',
        nom: 'Anonymal',
        commune: 'Reims',
        code_postal: '51100',
        adresse: '12 BIS RUE DE LECLERCQ',
        services: CNFS_COMMON_SERVICES,
        horaires: 'Mo 09:30-10:45; Tu 11:15-12:45; We 13:30-14:25; Th 8:00-9:25,15:00-16:05; Fr 16:20-17:15; Sa 18:30-19:00; Su 19:50-23:55',
        source: 'conseiller-numerique',
        conditions_access: 'Gratuit',
        labels_nationaux: 'CNFS',
        structureId: 'abc88891b3f44bdf86bb7bc2601d3ddd',
        aidants: [
          { aidantId: 'aaa88891b3f44bdf86bb7bc2601d3fff', nom: 'Jean Dupond', courriel: 'jean.dupond@gouv.fr', telephone: '+33ZABPQMCDU' }
        ]
      }
    ]);
  });

  it('devrait avoir une date de mise à jour', async () => {
    const permanence = {
      _id: 'abf48891b3f44bdf86bb7bc2601d3d5b',
      nomEnseigne: 'Anonymal',
      adresse: {
        ville: 'Reims',
        codePostal: '51100',
        numeroRue: '12 BIS',
        rue: 'RUE DE LECLERCQ'
      },
      updatedAt: new Date('2022-06-02T12:23:00.442Z'),
      structure: {
        _id: 'abc88891b3f44bdf86bb7bc2601d3ddd'
      },
      aidants: [
        { _id: 'aaa88891b3f44bdf86bb7bc2601d3fff', prenom: 'Jean', nom: 'Dupond', emailPro: 'jean.dupond@gouv.fr', telephonePro: '+33ZABPQMCDU' }
      ]
    };

    const lieux = await lieuxDeMediationNumerique({ getPermanences: () => [permanence] });

    expect(lieux).toStrictEqual([
      {
        id: 'abf48891b3f44bdf86bb7bc2601d3d5b',
        nom: 'Anonymal',
        commune: 'Reims',
        code_postal: '51100',
        adresse: '12 BIS RUE DE LECLERCQ',
        services: CNFS_COMMON_SERVICES,
        source: 'conseiller-numerique',
        conditions_access: 'Gratuit',
        date_maj: '2022-06-02',
        labels_nationaux: 'CNFS',
        structureId: 'abc88891b3f44bdf86bb7bc2601d3ddd',
        aidants: [
          { aidantId: 'aaa88891b3f44bdf86bb7bc2601d3fff', nom: 'Jean Dupond', courriel: 'jean.dupond@gouv.fr', telephone: '+33ZABPQMCDU' }
        ]
      }
    ]);
  });

  it('devrait avoir le label France Services', async () => {
    const permanence = {
      _id: 'abf48891b3f44bdf86bb7bc2601d3d5b',
      nomEnseigne: 'Anonymal',
      adresse: {
        ville: 'Reims',
        codePostal: '51100',
        numeroRue: '12 BIS',
        rue: 'RUE DE LECLERCQ'
      },
      structure: {
        _id: 'abc88891b3f44bdf86bb7bc2601d3ddd',
        estLabelliseFranceServices: 'OUI'
      },
      aidants: [
        { _id: 'aaa88891b3f44bdf86bb7bc2601d3fff', prenom: 'Jean', nom: 'Dupond', emailPro: 'jean.dupond@gouv.fr', telephonePro: '+33ZABPQMCDU' }
      ]
    };

    const lieux = await lieuxDeMediationNumerique({ getPermanences: () => [permanence] });

    expect(lieux).toStrictEqual([
      {
        id: 'abf48891b3f44bdf86bb7bc2601d3d5b',
        nom: 'Anonymal',
        commune: 'Reims',
        code_postal: '51100',
        adresse: '12 BIS RUE DE LECLERCQ',
        services: CNFS_COMMON_SERVICES,
        source: 'conseiller-numerique',
        conditions_access: 'Gratuit',
        labels_nationaux: 'CNFS, France Services',
        structureId: 'abc88891b3f44bdf86bb7bc2601d3ddd',
        aidants: [
          { aidantId: 'aaa88891b3f44bdf86bb7bc2601d3fff', nom: 'Jean Dupond', courriel: 'jean.dupond@gouv.fr', telephone: '+33ZABPQMCDU' }
        ]
      }
    ]);
  });

  it('devrait avoir le label Aidants Connect', async () => {
    const permanence = {
      _id: 'abf48891b3f44bdf86bb7bc2601d3d5b',
      nomEnseigne: 'Anonymal',
      adresse: {
        ville: 'Reims',
        codePostal: '51100',
        numeroRue: '12 BIS',
        rue: 'RUE DE LECLERCQ'
      },
      structure: {
        _id: 'abc88891b3f44bdf86bb7bc2601d3ddd',
        estLabelliseAidantsConnect: 'OUI'
      },
      aidants: [
        { _id: 'aaa88891b3f44bdf86bb7bc2601d3fff', prenom: 'Jean', nom: 'Dupond', emailPro: 'jean.dupond@gouv.fr', telephonePro: '+33ZABPQMCDU' }
      ]
    };

    const lieux = await lieuxDeMediationNumerique({ getPermanences: () => [permanence] });

    expect(lieux).toStrictEqual([
      {
        id: 'abf48891b3f44bdf86bb7bc2601d3d5b',
        nom: 'Anonymal',
        commune: 'Reims',
        code_postal: '51100',
        adresse: '12 BIS RUE DE LECLERCQ',
        services: CNFS_COMMON_SERVICES,
        source: 'conseiller-numerique',
        conditions_access: 'Gratuit',
        labels_nationaux: 'CNFS, Aidants Connect',
        structureId: 'abc88891b3f44bdf86bb7bc2601d3ddd',
        aidants: [
          { aidantId: 'aaa88891b3f44bdf86bb7bc2601d3fff', nom: 'Jean Dupond', courriel: 'jean.dupond@gouv.fr', telephone: '+33ZABPQMCDU' }
        ]
      }
    ]);
  });

  it('devrait avoir le label Aidants Connect et le label France Services', async () => {
    const permanence = {
      _id: 'abf48891b3f44bdf86bb7bc2601d3d5b',
      nomEnseigne: 'Anonymal',
      adresse: {
        ville: 'Reims',
        codePostal: '51100',
        numeroRue: '12 BIS',
        rue: 'RUE DE LECLERCQ'
      },
      structure: {
        _id: 'abc88891b3f44bdf86bb7bc2601d3ddd',
        estLabelliseAidantsConnect: 'OUI',
        estLabelliseFranceServices: 'OUI'
      },
      aidants: [
        { _id: 'aaa88891b3f44bdf86bb7bc2601d3fff', prenom: 'Jean', nom: 'Dupond', emailPro: 'jean.dupond@gouv.fr', telephonePro: '+33ZABPQMCDU' }
      ]
    };

    const lieux = await lieuxDeMediationNumerique({ getPermanences: () => [permanence] });

    expect(lieux).toStrictEqual([
      {
        id: 'abf48891b3f44bdf86bb7bc2601d3d5b',
        nom: 'Anonymal',
        commune: 'Reims',
        code_postal: '51100',
        adresse: '12 BIS RUE DE LECLERCQ',
        services: CNFS_COMMON_SERVICES,
        source: 'conseiller-numerique',
        conditions_access: 'Gratuit',
        labels_nationaux: 'CNFS, Aidants Connect, France Services',
        structureId: 'abc88891b3f44bdf86bb7bc2601d3ddd',
        aidants: [
          { aidantId: 'aaa88891b3f44bdf86bb7bc2601d3fff', nom: 'Jean Dupond', courriel: 'jean.dupond@gouv.fr', telephone: '+33ZABPQMCDU' }
        ]
      }
    ]);
  });

  it('devrait avoir une url de prise de rdv', async () => {
    const permanence = {
      _id: 'abf48891b3f44bdf86bb7bc2601d3d5b',
      nomEnseigne: 'Anonymal',
      adresse: {
        ville: 'Reims',
        codePostal: '51100',
        numeroRue: '12 BIS',
        rue: 'RUE DE LECLERCQ'
      },
      structure: {
        _id: 'abc88891b3f44bdf86bb7bc2601d3ddd',
        urlPriseRdv: 'https://www.url-rdv.fr/org/1234'
      },
      aidants: [
        { _id: 'aaa88891b3f44bdf86bb7bc2601d3fff', prenom: 'Jean', nom: 'Dupond', emailPro: 'jean.dupond@gouv.fr', telephonePro: '+33ZABPQMCDU' }
      ]
    };

    const lieux = await lieuxDeMediationNumerique({ getPermanences: () => [permanence] });

    expect(lieux).toStrictEqual([
      {
        id: 'abf48891b3f44bdf86bb7bc2601d3d5b',
        nom: 'Anonymal',
        commune: 'Reims',
        code_postal: '51100',
        adresse: '12 BIS RUE DE LECLERCQ',
        services: CNFS_COMMON_SERVICES,
        source: 'conseiller-numerique',
        conditions_access: 'Gratuit',
        labels_nationaux: 'CNFS',
        prise_rdv: 'https://www.url-rdv.fr/org/1234',
        structureId: 'abc88891b3f44bdf86bb7bc2601d3ddd',
        aidants: [
          { aidantId: 'aaa88891b3f44bdf86bb7bc2601d3fff', nom: 'Jean Dupond', courriel: 'jean.dupond@gouv.fr', telephone: '+33ZABPQMCDU' }
        ]
      }
    ]);
  });

  it('devrait avoir une url de prise de rdv avec un préfix https', async () => {
    const permanence = {
      _id: 'abf48891b3f44bdf86bb7bc2601d3d5b',
      nomEnseigne: 'Anonymal',
      adresse: {
        ville: 'Reims',
        codePostal: '51100',
        numeroRue: '12 BIS',
        rue: 'RUE DE LECLERCQ'
      },
      structure: {
        _id: 'abc88891b3f44bdf86bb7bc2601d3ddd',
        urlPriseRdv: 'www.url-rdv.fr/org/1234'
      },
      aidants: [
        { _id: 'aaa88891b3f44bdf86bb7bc2601d3fff', prenom: 'Jean', nom: 'Dupond', emailPro: 'jean.dupond@gouv.fr', telephonePro: '+33ZABPQMCDU' }
      ]
    };

    const lieux = await lieuxDeMediationNumerique({ getPermanences: () => [permanence] });

    expect(lieux).toStrictEqual([
      {
        id: 'abf48891b3f44bdf86bb7bc2601d3d5b',
        nom: 'Anonymal',
        commune: 'Reims',
        code_postal: '51100',
        adresse: '12 BIS RUE DE LECLERCQ',
        services: CNFS_COMMON_SERVICES,
        source: 'conseiller-numerique',
        conditions_access: 'Gratuit',
        labels_nationaux: 'CNFS',
        prise_rdv: 'https://www.url-rdv.fr/org/1234',
        structureId: 'abc88891b3f44bdf86bb7bc2601d3ddd',
        aidants: [
          { aidantId: 'aaa88891b3f44bdf86bb7bc2601d3fff', nom: 'Jean Dupond', courriel: 'jean.dupond@gouv.fr', telephone: '+33ZABPQMCDU' }
        ]
      }
    ]);
  });

  it('devrait avoir une url de prise de rdv sans espaces', async () => {
    const permanence = {
      _id: 'abf48891b3f44bdf86bb7bc2601d3d5b',
      nomEnseigne: 'Anonymal',
      adresse: {
        ville: 'Reims',
        codePostal: '51100',
        numeroRue: '12 BIS',
        rue: 'RUE DE LECLERCQ'
      },
      structure: {
        _id: 'abc88891b3f44bdf86bb7bc2601d3ddd',
        urlPriseRdv: 'https://  www.url-rdv.fr/org/1234  '
      },
      aidants: [
        { _id: 'aaa88891b3f44bdf86bb7bc2601d3fff', prenom: 'Jean', nom: 'Dupond', emailPro: 'jean.dupond@gouv.fr', telephonePro: '+33ZABPQMCDU' }
      ]
    };

    const lieux = await lieuxDeMediationNumerique({ getPermanences: () => [permanence] });

    expect(lieux).toStrictEqual([
      {
        id: 'abf48891b3f44bdf86bb7bc2601d3d5b',
        nom: 'Anonymal',
        commune: 'Reims',
        code_postal: '51100',
        adresse: '12 BIS RUE DE LECLERCQ',
        services: CNFS_COMMON_SERVICES,
        source: 'conseiller-numerique',
        conditions_access: 'Gratuit',
        labels_nationaux: 'CNFS',
        prise_rdv: 'https://www.url-rdv.fr/org/1234',
        structureId: 'abc88891b3f44bdf86bb7bc2601d3ddd',
        aidants: [
          { aidantId: 'aaa88891b3f44bdf86bb7bc2601d3fff', nom: 'Jean Dupond', courriel: 'jean.dupond@gouv.fr', telephone: '+33ZABPQMCDU' }
        ]
      }
    ]);
  });

  it('devrait avoir une url de prise de rdv avec un seul préfixe https://', async () => {
    const permanence = {
      _id: 'abf48891b3f44bdf86bb7bc2601d3d5b',
      nomEnseigne: 'Anonymal',
      adresse: {
        ville: 'Reims',
        codePostal: '51100',
        numeroRue: '12 BIS',
        rue: 'RUE DE LECLERCQ'
      },
      structure: {
        _id: 'abc88891b3f44bdf86bb7bc2601d3ddd',
        urlPriseRdv: 'https://www.https://www.url-rdv.fr/org/1234'
      },
      aidants: [
        { _id: 'aaa88891b3f44bdf86bb7bc2601d3fff', prenom: 'Jean', nom: 'Dupond', emailPro: 'jean.dupond@gouv.fr', telephonePro: '+33ZABPQMCDU' }
      ]
    };

    const lieux = await lieuxDeMediationNumerique({ getPermanences: () => [permanence] });

    expect(lieux).toStrictEqual([
      {
        id: 'abf48891b3f44bdf86bb7bc2601d3d5b',
        nom: 'Anonymal',
        commune: 'Reims',
        code_postal: '51100',
        adresse: '12 BIS RUE DE LECLERCQ',
        services: CNFS_COMMON_SERVICES,
        source: 'conseiller-numerique',
        conditions_access: 'Gratuit',
        labels_nationaux: 'CNFS',
        prise_rdv: 'https://www.url-rdv.fr/org/1234',
        structureId: 'abc88891b3f44bdf86bb7bc2601d3ddd',
        aidants: [
          { aidantId: 'aaa88891b3f44bdf86bb7bc2601d3fff', nom: 'Jean Dupond', courriel: 'jean.dupond@gouv.fr', telephone: '+33ZABPQMCDU' }
        ]
      }
    ]);
  });

  it('devrait avoir au moins 1 aidant associé', async () => {
    const permanence = {
      _id: 'abf48891b3f44bdf86bb7bc2601d3d5b',
      nomEnseigne: 'Anonymal',
      adresse: {
        ville: 'Reims',
        codePostal: '51100',
        numeroRue: '12 BIS',
        rue: 'RUE DE LECLERCQ'
      },
      structure: {
        _id: 'abc88891b3f44bdf86bb7bc2601d3ddd'
      },
      aidants: []
    };

    const lieux = await lieuxDeMediationNumerique({ getPermanences: () => [permanence] });

    expect(lieux).toStrictEqual([]);
  });

  it('devrait avoir au moins 1 aidant associé non anonyme', async () => {
    const permanence = {
      _id: 'abf48891b3f44bdf86bb7bc2601d3d5b',
      nomEnseigne: 'Anonymal',
      adresse: {
        ville: 'Reims',
        codePostal: '51100',
        numeroRue: '12 BIS',
        rue: 'RUE DE LECLERCQ'
      },
      structure: {
        _id: 'abc88891b3f44bdf86bb7bc2601d3ddd'
      },
      aidants: [
        { _id: 1, nom: 'Jean', prenom: 'Dupond', nonAffichageCarto: true }
      ]
    };

    const lieux = await lieuxDeMediationNumerique({ getPermanences: () => [permanence] });

    expect(lieux).toStrictEqual([]);
  });

  it('devrait avoir un aidant si un conseiller non anonyme est remonté', async () => {
    const permanence = {
      _id: 'abf48891b3f44bdf86bb7bc2601d3d5b',
      nomEnseigne: 'Anonymal',
      adresse: {
        ville: 'Reims',
        codePostal: '51100',
        numeroRue: '12 BIS',
        rue: 'RUE DE LECLERCQ'
      },
      structure: {
        _id: 'abc88891b3f44bdf86bb7bc2601d3ddd'
      },
      aidants: [
        { _id: 'aaa88891b3f44bdf86bb7bc2601d3fff', prenom: 'Jean', nom: 'Dupond', emailPro: 'jean.dupond@gouv.fr', telephonePro: '+33ZABPQMCDU' }
      ]
    };

    const lieux = await lieuxDeMediationNumerique({ getPermanences: () => [permanence] });

    expect(lieux).toStrictEqual([
      {
        id: 'abf48891b3f44bdf86bb7bc2601d3d5b',
        nom: 'Anonymal',
        commune: 'Reims',
        code_postal: '51100',
        adresse: '12 BIS RUE DE LECLERCQ',
        services: CNFS_COMMON_SERVICES,
        source: 'conseiller-numerique',
        conditions_access: 'Gratuit',
        labels_nationaux: 'CNFS',
        structureId: 'abc88891b3f44bdf86bb7bc2601d3ddd',
        aidants: [
          { aidantId: 'aaa88891b3f44bdf86bb7bc2601d3fff', nom: 'Jean Dupond', courriel: 'jean.dupond@gouv.fr', telephone: '+33ZABPQMCDU' }
        ]
      }
    ]);
  });

  it('devrait avoir aucun doublon d\'aidant de même id', async () => {
    const permanence = {
      _id: 'abf48891b3f44bdf86bb7bc2601d3d5b',
      nomEnseigne: 'Anonymal',
      adresse: {
        ville: 'Reims',
        codePostal: '51100',
        numeroRue: '12 BIS',
        rue: 'RUE DE LECLERCQ'
      },
      structure: {
        _id: 'abc88891b3f44bdf86bb7bc2601d3ddd'
      },
      aidants: [
        { _id: 'aaa88891b3f44bdf86bb7bc2601d3fff', prenom: 'Jean', nom: 'Dupond', emailPro: 'jean.dupond@gouv.fr', telephonePro: '+33ZABPQMCDU' },
        { _id: 'aaa88891b3f44bdf86bb7bc2601d3fff', prenom: 'Jean', nom: 'Dupond', emailPro: 'jean.dupond@gouv.fr', telephonePro: '+33ZABPQMCDU' },
      ]
    };

    const lieux = await lieuxDeMediationNumerique({ getPermanences: () => [permanence] });

    expect(lieux).toStrictEqual([
      {
        id: 'abf48891b3f44bdf86bb7bc2601d3d5b',
        nom: 'Anonymal',
        commune: 'Reims',
        code_postal: '51100',
        adresse: '12 BIS RUE DE LECLERCQ',
        services: CNFS_COMMON_SERVICES,
        source: 'conseiller-numerique',
        conditions_access: 'Gratuit',
        labels_nationaux: 'CNFS',
        structureId: 'abc88891b3f44bdf86bb7bc2601d3ddd',
        aidants: [
          { aidantId: 'aaa88891b3f44bdf86bb7bc2601d3fff', nom: 'Jean Dupond', courriel: 'jean.dupond@gouv.fr', telephone: '+33ZABPQMCDU' }
        ]
      }
    ]);
  });

  it('devrait avoir un aidant avec un format de nom correct', async () => {
    const permanence = {
      _id: 'abf48891b3f44bdf86bb7bc2601d3d5b',
      nomEnseigne: 'Anonymal',
      adresse: {
        ville: 'Reims',
        codePostal: '51100',
        numeroRue: '12 BIS',
        rue: 'RUE DE LECLERCQ'
      },
      structure: {
        _id: 'abc88891b3f44bdf86bb7bc2601d3ddd'
      },
      aidants: [
        { _id: 'aaa88891b3f44bdf86bb7bc2601d3fff', prenom: 'JEAN claude', nom: 'de la rivière', emailPro: 'jean-claude@gouv.fr', telephonePro: '+33ZABPQMCDU' },
        { _id: 'bbb88891b3f44bdf86bb7bc2601d3ggg', prenom: 'jean', nom: 'DUPOND', emailPro: 'jean.dupond@gouv.fr', telephonePro: '+33ZABPQMCDU' },
        // eslint-disable-next-line max-len
        { _id: 'ccc88891b3f44bdf86bb7bc2601d3hhh', prenom: 'jean-pierre', nom: 'dupont-dupond', emailPro: 'jean-pierre.dupont@gouv.fr', telephonePro: '+33ZABPQMCDU' }
      ]
    };

    const lieux = await lieuxDeMediationNumerique({ getPermanences: () => [permanence] });

    expect(lieux).toStrictEqual([
      {
        id: 'abf48891b3f44bdf86bb7bc2601d3d5b',
        nom: 'Anonymal',
        commune: 'Reims',
        code_postal: '51100',
        adresse: '12 BIS RUE DE LECLERCQ',
        services: CNFS_COMMON_SERVICES,
        source: 'conseiller-numerique',
        conditions_access: 'Gratuit',
        labels_nationaux: 'CNFS',
        structureId: 'abc88891b3f44bdf86bb7bc2601d3ddd',
        aidants: [
          { aidantId: 'aaa88891b3f44bdf86bb7bc2601d3fff', nom: 'Jean Claude De La Rivière', courriel: 'jean-claude@gouv.fr', telephone: '+33ZABPQMCDU' },
          { aidantId: 'bbb88891b3f44bdf86bb7bc2601d3ggg', nom: 'Jean Dupond', courriel: 'jean.dupond@gouv.fr', telephone: '+33ZABPQMCDU' },
          { aidantId: 'ccc88891b3f44bdf86bb7bc2601d3hhh', nom: 'Jean-Pierre Dupont-Dupond', courriel: 'jean-pierre.dupont@gouv.fr', telephone: '+33ZABPQMCDU' }
        ]
      }
    ]);
  });

  it('devrait avoir un aidant avec seulement ses informations renseignées', async () => {
    const permanence = {
      _id: 'abf48891b3f44bdf86bb7bc2601d3d5b',
      nomEnseigne: 'Anonymal',
      adresse: {
        ville: 'Reims',
        codePostal: '51100',
        numeroRue: '12 BIS',
        rue: 'RUE DE LECLERCQ'
      },
      structure: {
        _id: 'abc88891b3f44bdf86bb7bc2601d3ddd'
      },
      aidants: [
        { _id: 'aaa88891b3f44bdf86bb7bc2601d3fff', prenom: 'JEAN claude', nom: 'de la rivière', telephonePro: '+33ZABPQMCDU' },
        { _id: 'bbb88891b3f44bdf86bb7bc2601d3ggg', prenom: 'jean', nom: 'DUPOND' },
        { _id: 'ccc88891b3f44bdf86bb7bc2601d3hhh', prenom: 'jean-pierre', nom: 'dupont-dupond', emailPro: 'jean-pierre.dupont@gouv.fr' }
      ]
    };

    const lieux = await lieuxDeMediationNumerique({ getPermanences: () => [permanence] });

    expect(lieux).toStrictEqual([
      {
        id: 'abf48891b3f44bdf86bb7bc2601d3d5b',
        nom: 'Anonymal',
        commune: 'Reims',
        code_postal: '51100',
        adresse: '12 BIS RUE DE LECLERCQ',
        services: CNFS_COMMON_SERVICES,
        source: 'conseiller-numerique',
        conditions_access: 'Gratuit',
        labels_nationaux: 'CNFS',
        structureId: 'abc88891b3f44bdf86bb7bc2601d3ddd',
        aidants: [
          { aidantId: 'aaa88891b3f44bdf86bb7bc2601d3fff', nom: 'Jean Claude De La Rivière', telephone: '+33ZABPQMCDU' },
          { aidantId: 'bbb88891b3f44bdf86bb7bc2601d3ggg', nom: 'Jean Dupond' },
          { aidantId: 'ccc88891b3f44bdf86bb7bc2601d3hhh', nom: 'Jean-Pierre Dupont-Dupond', courriel: 'jean-pierre.dupont@gouv.fr' }
        ]
      }
    ]);
  });

  it('devrait avoir des aidants par ordre alphabétique prenom nom', async () => {
    const permanence = {
      _id: 'abf48891b3f44bdf86bb7bc2601d3d5b',
      nomEnseigne: 'Anonymal',
      adresse: {
        ville: 'Reims',
        codePostal: '51100',
        numeroRue: '12 BIS',
        rue: 'RUE DE LECLERCQ'
      },
      structure: {
        _id: 'abc88891b3f44bdf86bb7bc2601d3ddd'
      },
      aidants: [
        { _id: 'aaa88891b3f44bdf86bb7bc2601d3fff', prenom: 'zebulon', nom: 'DUPOND' },
        { _id: 'bbb88891b3f44bdf86bb7bc2601d3ggg', prenom: 'zebulon', nom: 'DUPOND' },
        { _id: 'ccc88891b3f44bdf86bb7bc2601d3hhh', prenom: 'jean-pierre', nom: 'dupont-dupond' },
        { _id: 'ddd88891b3f44bdf86bb7bc2601d3iii', prenom: 'arthur', nom: 'de la rivière' }
      ]
    };

    const lieux = await lieuxDeMediationNumerique({ getPermanences: () => [permanence] });

    expect(lieux).toStrictEqual([
      {
        id: 'abf48891b3f44bdf86bb7bc2601d3d5b',
        nom: 'Anonymal',
        commune: 'Reims',
        code_postal: '51100',
        adresse: '12 BIS RUE DE LECLERCQ',
        services: CNFS_COMMON_SERVICES,
        source: 'conseiller-numerique',
        conditions_access: 'Gratuit',
        labels_nationaux: 'CNFS',
        structureId: 'abc88891b3f44bdf86bb7bc2601d3ddd',
        aidants: [
          { aidantId: 'ddd88891b3f44bdf86bb7bc2601d3iii', nom: 'Arthur De La Rivière' },
          { aidantId: 'ccc88891b3f44bdf86bb7bc2601d3hhh', nom: 'Jean-Pierre Dupont-Dupond' },
          { aidantId: 'aaa88891b3f44bdf86bb7bc2601d3fff', nom: 'Zebulon Dupond' },
          { aidantId: 'bbb88891b3f44bdf86bb7bc2601d3ggg', nom: 'Zebulon Dupond' }
        ]
      }
    ]);
  });
});
