const { lieuxDeMediationNumerique, CNFS_COMMON_SERVICES } = require('./lieux-de-mediation-numerique.core');

describe('lieux de médiation numérique', () => {
  it('devrait avoir les informations obligatoires du schéma de médiation numérique', async () => {
    const permanence = {
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
        id: '43493312300029',
        nom: 'Anonymal',
        commune: 'Reims',
        code_postal: '51100',
        code_insee: 'MISSING',
        adresse: '12 BIS RUE DE LECLERCQ',
        services: CNFS_COMMON_SERVICES,
        source: 'conseiller-numerique',
        modalites_access: 'Gratuit'
      }
    ]);
  });

  it('devrait avoir un id qui ne contient aucun espace', async () => {
    const permanence = {
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
        id: '43493312300029',
        nom: 'Anonymal',
        commune: 'Reims',
        code_postal: '51100',
        code_insee: 'MISSING',
        adresse: '12 BIS RUE DE LECLERCQ',
        services: CNFS_COMMON_SERVICES,
        source: 'conseiller-numerique',
        modalites_access: 'Gratuit'
      }
    ]);
  });

  it('devrait exclure les lieux dont l\'id est null', async () => {
    const permanence = {
      siret: null,
      nomEnseigne: 'Anonymal',
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

  it('devrait exclure les lieux dont l\'id est vide', async () => {
    const permanence = {
      siret: '',
      nomEnseigne: 'Anonymal',
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

  it('devrait avoir un nom', async () => {
    const permanence = {
      siret: '43493312300029',
      nomEnseigne: 'Anonymal',
      adresse: {
        ville: 'Reims',
        codePostal: '51100',
        code_insee: 'MISSING',
        numeroRue: '12 BIS',
        rue: 'RUE DE LECLERCQ'
      }
    };

    const lieux = await lieuxDeMediationNumerique({ getPermanences: () => [permanence] });

    expect(lieux).toStrictEqual([
      {
        id: '43493312300029',
        nom: 'Anonymal',
        commune: 'Reims',
        code_postal: '51100',
        code_insee: 'MISSING',
        adresse: '12 BIS RUE DE LECLERCQ',
        services: CNFS_COMMON_SERVICES,
        source: 'conseiller-numerique',
        modalites_access: 'Gratuit'
      }
    ]);
  });

  it('devrait avoir un nom sans espaces superflus', async () => {
    const permanence = {
      siret: '43493312300029',
      nomEnseigne: ' Association  Anonymal  ',
      adresse: {
        ville: 'Reims',
        codePostal: '51100',
        code_insee: 'MISSING',
        numeroRue: '12 BIS',
        rue: 'RUE DE LECLERCQ'
      }
    };

    const lieux = await lieuxDeMediationNumerique({ getPermanences: () => [permanence] });

    expect(lieux).toStrictEqual([
      {
        id: '43493312300029',
        nom: 'Association Anonymal',
        commune: 'Reims',
        code_postal: '51100',
        code_insee: 'MISSING',
        adresse: '12 BIS RUE DE LECLERCQ',
        services: CNFS_COMMON_SERVICES,
        source: 'conseiller-numerique',
        modalites_access: 'Gratuit'
      }
    ]);
  });

  it('devrait exclure les lieux dont le nom est null', async () => {
    const permanence = {
      siret: '43493312300029',
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
      siret: '43493312300029',
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
        id: '43493312300029',
        nom: 'Anonymal',
        commune: 'Reims',
        code_postal: '51100',
        code_insee: 'MISSING',
        adresse: '12 BIS RUE DE LECLERCQ',
        services: CNFS_COMMON_SERVICES,
        source: 'conseiller-numerique',
        modalites_access: 'Gratuit'
      }
    ]);
  });

  it('devrait avoir une commune sans espaces superflus', async () => {
    const permanence = {
      siret: '43493312300029',
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
        id: '43493312300029',
        nom: 'Anonymal',
        commune: 'Villeneuve sur Eure',
        code_postal: '51100',
        code_insee: 'MISSING',
        adresse: '12 BIS RUE DE LECLERCQ',
        services: CNFS_COMMON_SERVICES,
        source: 'conseiller-numerique',
        modalites_access: 'Gratuit'
      }
    ]);
  });

  it('devrait avoir un code postal', async () => {
    const permanence = {
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
        id: '43493312300029',
        nom: 'Anonymal',
        commune: 'Reims',
        code_postal: '51100',
        code_insee: 'MISSING',
        adresse: '12 BIS RUE DE LECLERCQ',
        services: CNFS_COMMON_SERVICES,
        source: 'conseiller-numerique',
        modalites_access: 'Gratuit'
      }
    ]);
  });

  it('devrait avoir un code postal sans espaces', async () => {
    const permanence = {
      siret: '43493312300029',
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
        id: '43493312300029',
        nom: 'Anonymal',
        commune: 'Reims',
        code_postal: '51100',
        code_insee: 'MISSING',
        adresse: '12 BIS RUE DE LECLERCQ',
        services: CNFS_COMMON_SERVICES,
        source: 'conseiller-numerique',
        modalites_access: 'Gratuit'
      }
    ]);
  });

  it('devrait filtrer les codes postaux nulles', async () => {
    const permanence = {
      siret: '43493312300029',
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
      siret: '43493312300029',
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
        id: '43493312300029',
        nom: 'Anonymal',
        commune: 'Reims',
        code_postal: '51100',
        code_insee: 'MISSING',
        adresse: '12 BIS RUE DE LECLERCQ',
        services: CNFS_COMMON_SERVICES,
        source: 'conseiller-numerique',
        modalites_access: 'Gratuit'
      }
    ]);
  });

  it('devrait avoir une adresse', async () => {
    const permanence = {
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
        id: '43493312300029',
        nom: 'Anonymal',
        commune: 'Reims',
        code_postal: '51100',
        code_insee: 'MISSING',
        adresse: '12 BIS RUE DE LECLERCQ',
        services: CNFS_COMMON_SERVICES,
        source: 'conseiller-numerique',
        modalites_access: 'Gratuit'
      }
    ]);
  });

  it('devrait avoir une adresse sans espaces superflus', async () => {
    const permanence = {
      siret: '43493312300029',
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
        id: '43493312300029',
        nom: 'Anonymal',
        commune: 'Reims',
        code_postal: '51100',
        code_insee: 'MISSING',
        adresse: '12 BIS RUE DE LECLERCQ',
        services: CNFS_COMMON_SERVICES,
        source: 'conseiller-numerique',
        modalites_access: 'Gratuit'
      }
    ]);
  });

  it('devrait avoir une adresse sans le motif "null "', async () => {
    const permanence = {
      siret: '43493312300029',
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
        id: '43493312300029',
        nom: 'Anonymal',
        commune: 'Reims',
        code_postal: '51100',
        code_insee: 'MISSING',
        adresse: '12 RUE DE LECLERCQ',
        services: CNFS_COMMON_SERVICES,
        source: 'conseiller-numerique',
        modalites_access: 'Gratuit'
      }
    ]);
  });

  it('devrait avoir une adresse sans le motif "null null"', async () => {
    const permanence = {
      siret: '43493312300029',
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

  it('devrait filtrer une adresse dont la voie et le numéro de rue sont nulles', async () => {
    const permanence = {
      siret: '43493312300029',
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
      siret: '43493312300029',
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
        id: '43493312300029',
        nom: 'Anonymal',
        commune: 'Reims',
        code_postal: '51100',
        code_insee: 'MISSING',
        adresse: '12 BIS RUE DE LECLERCQ',
        services: CNFS_COMMON_SERVICES,
        latitude: 43.52609,
        longitude: 5.41423,
        source: 'conseiller-numerique',
        modalites_access: 'Gratuit'
      }
    ]);
  });

  it('devrait avoir un numéro de téléphone', async () => {
    const permanence = {
      siret: '43493312300029',
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
        id: '43493312300029',
        nom: 'Anonymal',
        commune: 'Reims',
        code_postal: '51100',
        code_insee: 'MISSING',
        adresse: '12 BIS RUE DE LECLERCQ',
        services: CNFS_COMMON_SERVICES,
        telephone: '+33180059880',
        source: 'conseiller-numerique',
        modalites_access: 'Gratuit'
      }
    ]);
  });

  it('devrait avoir un numéro de téléphone sans espaces', async () => {
    const permanence = {
      siret: '43493312300029',
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
        id: '43493312300029',
        nom: 'Anonymal',
        commune: 'Reims',
        code_postal: '51100',
        code_insee: 'MISSING',
        adresse: '12 BIS RUE DE LECLERCQ',
        services: CNFS_COMMON_SERVICES,
        telephone: '+33180059880',
        source: 'conseiller-numerique',
        modalites_access: 'Gratuit'
      }
    ]);
  });

  it('devrait avoir un numéro de téléphone sans points', async () => {
    const permanence = {
      siret: '43493312300029',
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
        id: '43493312300029',
        nom: 'Anonymal',
        commune: 'Reims',
        code_postal: '51100',
        code_insee: 'MISSING',
        adresse: '12 BIS RUE DE LECLERCQ',
        services: CNFS_COMMON_SERVICES,
        telephone: '+33180059880',
        source: 'conseiller-numerique',
        modalites_access: 'Gratuit'
      }
    ]);
  });

  it('devrait avoir une adresse email', async () => {
    const permanence = {
      siret: '43493312300029',
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
        id: '43493312300029',
        nom: 'Anonymal',
        commune: 'Reims',
        code_postal: '51100',
        code_insee: 'MISSING',
        adresse: '12 BIS RUE DE LECLERCQ',
        services: CNFS_COMMON_SERVICES,
        courriel: 'contact@laquincaillerie.tl',
        source: 'conseiller-numerique',
        modalites_access: 'Gratuit'
      }
    ]);
  });

  it('devrait avoir une adresse email sans espaces', async () => {
    const permanence = {
      siret: '43493312300029',
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
        id: '43493312300029',
        nom: 'Anonymal',
        commune: 'Reims',
        code_postal: '51100',
        code_insee: 'MISSING',
        adresse: '12 BIS RUE DE LECLERCQ',
        services: CNFS_COMMON_SERVICES,
        courriel: 'contact@laquincaillerie.tl',
        source: 'conseiller-numerique',
        modalites_access: 'Gratuit'
      }
    ]);
  });

  it('devrait avoir un site web', async () => {
    const permanence = {
      siret: '43493312300029',
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
        id: '43493312300029',
        nom: 'Anonymal',
        commune: 'Reims',
        code_postal: '51100',
        code_insee: 'MISSING',
        adresse: '12 BIS RUE DE LECLERCQ',
        services: CNFS_COMMON_SERVICES,
        site_web: 'https://www.laquincaillerie.tl/',
        source: 'conseiller-numerique',
        modalites_access: 'Gratuit'
      }
    ]);
  });

  it('devrait avoir un site web sans espaces', async () => {
    const permanence = {
      siret: '43493312300029',
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
        id: '43493312300029',
        nom: 'Anonymal',
        commune: 'Reims',
        code_postal: '51100',
        code_insee: 'MISSING',
        adresse: '12 BIS RUE DE LECLERCQ',
        services: CNFS_COMMON_SERVICES,
        site_web: 'https://www.laquincaillerie.tl/',
        source: 'conseiller-numerique',
        modalites_access: 'Gratuit'
      }
    ]);
  });

  it('devrait avoir un site web avec un seul préfixe http(s)://', async () => {
    const permanence = {
      siret: '43493312300029',
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
        id: '43493312300029',
        nom: 'Anonymal',
        commune: 'Reims',
        code_postal: '51100',
        code_insee: 'MISSING',
        adresse: '12 BIS RUE DE LECLERCQ',
        services: CNFS_COMMON_SERVICES,
        site_web: 'https://www.laquincaillerie.tl/',
        source: 'conseiller-numerique',
        modalites_access: 'Gratuit'
      }
    ]);
  });

  it('devrait convertir les horaires au format OSM pour une permanence qui ouvre tous les jours à des heures différentes', async () => {
    const permanence = {
      siret: '43493312300029',
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
        id: '43493312300029',
        nom: 'Anonymal',
        commune: 'Reims',
        code_postal: '51100',
        code_insee: 'MISSING',
        adresse: '12 BIS RUE DE LECLERCQ',
        services: CNFS_COMMON_SERVICES,
        horaires: 'Mo 09:30-10:45; Tu 11:15-12:45; We 13:30-14:25; Th 8:00-9:25,15:00-16:05; Fr 16:20-17:15; Sa 18:30-19:00; Su 19:50-23:55',
        source: 'conseiller-numerique',
        modalites_access: 'Gratuit'
      }
    ]);
  });

  it('devrait avoir une structure parente quand un siret est défini pour la structure liée à la permanence', async () => {
    const permanence = {
      siret: '43493312300029',
      nomEnseigne: 'Anonymal',
      adresse: {
        ville: 'Reims',
        codePostal: '51100',
        numeroRue: '12 BIS',
        rue: 'RUE DE LECLERCQ'
      },
      structure: {
        siret: '13000548100012'
      }
    };

    const lieux = await lieuxDeMediationNumerique({ getPermanences: () => [permanence] });

    expect(lieux).toStrictEqual([
      {
        id: '43493312300029',
        nom: 'Anonymal',
        commune: 'Reims',
        code_postal: '51100',
        code_insee: 'MISSING',
        adresse: '12 BIS RUE DE LECLERCQ',
        services: CNFS_COMMON_SERVICES,
        source: 'conseiller-numerique',
        modalites_access: 'Gratuit',
        structure_parente: '130005481'
      }
    ]);
  });

  it('devrait pas avoir une structure parente quand le siret est de la structure correspond à celui de la permanence', async () => {
    const permanence = {
      siret: '43493312300029',
      nomEnseigne: 'Anonymal',
      adresse: {
        ville: 'Reims',
        codePostal: '51100',
        numeroRue: '12 BIS',
        rue: 'RUE DE LECLERCQ'
      },
      structure: {
        siret: '43493312300029'
      }
    };

    const lieux = await lieuxDeMediationNumerique({ getPermanences: () => [permanence] });

    expect(lieux).toStrictEqual([
      {
        id: '43493312300029',
        nom: 'Anonymal',
        commune: 'Reims',
        code_postal: '51100',
        code_insee: 'MISSING',
        adresse: '12 BIS RUE DE LECLERCQ',
        services: CNFS_COMMON_SERVICES,
        source: 'conseiller-numerique',
        modalites_access: 'Gratuit'
      }
    ]);
  });

  it('devrait avoir une date de mise à jour', async () => {
    const permanence = {
      siret: '43493312300029',
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
        id: '43493312300029',
        nom: 'Anonymal',
        commune: 'Reims',
        code_postal: '51100',
        code_insee: 'MISSING',
        adresse: '12 BIS RUE DE LECLERCQ',
        services: CNFS_COMMON_SERVICES,
        source: 'conseiller-numerique',
        modalites_access: 'Gratuit',
        date_maj: '2022-06-02'
      }
    ]);
  });

  it('devrait avoir le label France Service', async () => {
    const permanence = {
      siret: '43493312300029',
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
        id: '43493312300029',
        nom: 'Anonymal',
        commune: 'Reims',
        code_postal: '51100',
        code_insee: 'MISSING',
        adresse: '12 BIS RUE DE LECLERCQ',
        services: CNFS_COMMON_SERVICES,
        source: 'conseiller-numerique',
        modalites_access: 'Gratuit',
        labels_nationaux: 'France Services'
      }
    ]);
  });

  it('devrait avoir le label Aidants Connect', async () => {
    const permanence = {
      siret: '43493312300029',
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
        id: '43493312300029',
        nom: 'Anonymal',
        commune: 'Reims',
        code_postal: '51100',
        code_insee: 'MISSING',
        adresse: '12 BIS RUE DE LECLERCQ',
        services: CNFS_COMMON_SERVICES,
        source: 'conseiller-numerique',
        modalites_access: 'Gratuit',
        labels_nationaux: 'Aidants Connect'
      }
    ]);
  });

  it('devrait avoir le label Aidants Connect et le label France Service', async () => {
    const permanence = {
      siret: '43493312300029',
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
        id: '43493312300029',
        nom: 'Anonymal',
        commune: 'Reims',
        code_postal: '51100',
        code_insee: 'MISSING',
        adresse: '12 BIS RUE DE LECLERCQ',
        services: CNFS_COMMON_SERVICES,
        source: 'conseiller-numerique',
        modalites_access: 'Gratuit',
        labels_nationaux: 'Aidants Connect, France Services'
      }
    ]);
  });
});
