const { lieuxDeMediationNumerique, CNFS_COMMON_SERVICES } = require('./lieux-de-mediation-numerique.core');

describe('lieux de médiation numérique', () => {
  it('devrait avoir les informations obligatoires du schéma de médiation numérique', async () => {
    const permanence = {
      _id: 'abf48891b3f44bdf86bb7bc2601d3d5b',
      nomEnseigne: 'Anonymal',
      adresse: {
        ville: 'Reims',
        codePostal: '51100',
        numeroRue: '12 BIS',
        rue: 'RUE DE LECLERCQ'
      }
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
        labels_nationaux: 'CNFS'
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
      }
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
        labels_nationaux: 'CNFS'
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
      }
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
        labels_nationaux: 'CNFS'
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
      }
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
        labels_nationaux: 'CNFS'
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
      }
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
        labels_nationaux: 'CNFS'
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
      }
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
      }
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
      }
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
        labels_nationaux: 'CNFS'
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
      }
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
        labels_nationaux: 'CNFS'
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
      }
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
        labels_nationaux: 'CNFS'
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
      }
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
        labels_nationaux: 'CNFS'
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
      }
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
      }
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
      }
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
        labels_nationaux: 'CNFS'
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
      }
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
        labels_nationaux: 'CNFS'
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
      }
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
        labels_nationaux: 'CNFS'
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
      }
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
        labels_nationaux: 'CNFS'
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
      }
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
      }
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
      }
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
        labels_nationaux: 'CNFS'
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
      numeroTelephone: '+33180059880'
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
        labels_nationaux: 'CNFS'
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
      numeroTelephone: ' +33 1 80 05 98 80 '
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
        labels_nationaux: 'CNFS'
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
      numeroTelephone: '+33.1.80.05.98.80'
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
        labels_nationaux: 'CNFS'
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
      numeroTelephone: '+330562636539'
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
        labels_nationaux: 'CNFS'
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
        labels_nationaux: 'CNFS'
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
        labels_nationaux: 'CNFS'
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
        labels_nationaux: 'CNFS'
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
        labels_nationaux: 'CNFS'
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
        labels_nationaux: 'CNFS'
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
        labels_nationaux: 'CNFS'
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
        labels_nationaux: 'CNFS'
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
      updatedAt: new Date('2022-06-02T12:23:00.442Z')
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
        labels_nationaux: 'CNFS'
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
        estLabelliseFranceServices: 'OUI'
      }
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
        labels_nationaux: 'CNFS, France Services'
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
        estLabelliseAidantsConnect: 'OUI'
      }
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
        labels_nationaux: 'CNFS, Aidants Connect'
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
        estLabelliseAidantsConnect: 'OUI',
        estLabelliseFranceServices: 'OUI'
      }
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
        labels_nationaux: 'CNFS, Aidants Connect, France Services'
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
        urlPriseRdv: 'https://www.url-rdv.fr/org/1234'
      }
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
        prise_rdv: 'https://www.url-rdv.fr/org/1234'
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
        urlPriseRdv: 'www.url-rdv.fr/org/1234'
      }
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
        prise_rdv: 'https://www.url-rdv.fr/org/1234'
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
        urlPriseRdv: 'https://  www.url-rdv.fr/org/1234  '
      }
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
        prise_rdv: 'https://www.url-rdv.fr/org/1234'
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
        urlPriseRdv: 'https://www.https://www.url-rdv.fr/org/1234'
      }
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
        prise_rdv: 'https://www.url-rdv.fr/org/1234'
      }
    ]);
  });
});
