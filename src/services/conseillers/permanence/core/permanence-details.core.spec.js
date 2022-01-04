const { permanenceDetails } = require('./permanence-details.core');

describe('détails de la permanence', () => {
  it('devrait retourner le détail de la permanence correspondant à l\'identifiant de la structure', async () => {
    const permanenceRepository = {
      getPermanenceByStructureId: () => ({
        nom: 'Aide rurale',
        contact: {
          email: 'john.doe@aide-rurale.net',
          telephone: '0423456897'
        },
        insee: {
          etablissement: {
            adresse: {
              numero_voie: '12',
              type_voie: 'RUE',
              nom_voie: 'DE LA PLACE',
              complement_adresse: null,
              code_postal: '87100',
              localite: 'LIMOGES',
              code_insee_localite: '87085',
              cedex: null
            }
          }
        }
      }),
      getNombreCnfs: () => 2
    };

    const structureId = '62a46ca2af2829d3cd298305';

    const expectedPermanenceDetails = {
      adresse: '12 RUE DE LA PLACE, 87100 LIMOGES',
      nom: 'Aide rurale',
      email: 'john.doe@aide-rurale.net',
      telephone: '04 23 45 68 97',
      nombreCnfs: 2
    };

    const details = await permanenceDetails(structureId, permanenceRepository);

    expect(details).toStrictEqual(expectedPermanenceDetails);
  });

  it('devrait retourner le détail de la permanence correspondant à l\'identifiant de la structure sans information insee', async () => {
    const permanenceRepository = {
      getPermanenceByStructureId: () => ({
        nom: 'Aide rurale',
        contact: {
          email: 'john.doe@aide-rurale.net',
          telephone: '04 23 45 68 97'
        }
      }),
      getNombreCnfs: () => 2
    };

    const structureId = '62a46ca2af2829d3cd298305';

    const expectedPermanenceDetails = {
      nom: 'Aide rurale',
      email: 'john.doe@aide-rurale.net',
      telephone: '04 23 45 68 97',
      nombreCnfs: 2
    };

    const details = await permanenceDetails(structureId, permanenceRepository);

    expect(details).toStrictEqual(expectedPermanenceDetails);
  });

  it('devrait retourner le détail de la permanence correspondant à l\'identifiant de la structure sans information insee', async () => {
    const permanenceRepository = {
      getPermanenceByStructureId: () => ({
        nom: 'Aide rurale',
        insee: {
          etablissement: {
            adresse: {
              numero_voie: '12',
              type_voie: 'RUE',
              nom_voie: 'DE LA PLACE',
              complement_adresse: null,
              code_postal: '87100',
              localite: 'LIMOGES',
              code_insee_localite: '87085',
              cedex: null
            }
          }
        }
      }),
      getNombreCnfs: () => 2
    };

    const structureId = '62a46ca2af2829d3cd298305';

    const expectedPermanenceDetails = {
      adresse: '12 RUE DE LA PLACE, 87100 LIMOGES',
      nom: 'Aide rurale',
      nombreCnfs: 2
    };

    const details = await permanenceDetails(structureId, permanenceRepository);

    expect(details).toStrictEqual(expectedPermanenceDetails);
  });

  it('devrait retourner le détail de la permanence correspondant à l\'identifiant de la structure sans téléphone', async () => {
    const permanenceRepository = {
      getPermanenceByStructureId: () => ({
        nom: 'Aide rurale',
        contact: {
          email: 'john.doe@aide-rurale.net'
        },
        insee: {
          etablissement: {
            adresse: {
              numero_voie: '12',
              type_voie: 'RUE',
              nom_voie: 'DE LA PLACE',
              complement_adresse: null,
              code_postal: '87100',
              localite: 'LIMOGES',
              code_insee_localite: '87085',
              cedex: null
            }
          }
        }
      }),
      getNombreCnfs: () => 2
    };

    const structureId = '62a46ca2af2829d3cd298305';

    const expectedPermanenceDetails = {
      adresse: '12 RUE DE LA PLACE, 87100 LIMOGES',
      nom: 'Aide rurale',
      email: 'john.doe@aide-rurale.net',
      nombreCnfs: 2
    };

    const details = await permanenceDetails(structureId, permanenceRepository);

    expect(details).toStrictEqual(expectedPermanenceDetails);
  });

  it('devrait retourner le détail de la permanence correspondant à l\'identifiant de la structure sans email', async () => {
    const permanenceRepository = {
      getPermanenceByStructureId: () => ({
        nom: 'Aide rurale',
        contact: {
          telephone: '0423456897'
        },
        insee: {
          etablissement: {
            adresse: {
              numero_voie: '12',
              type_voie: 'RUE',
              nom_voie: 'DE LA PLACE',
              complement_adresse: null,
              code_postal: '87100',
              localite: 'LIMOGES',
              code_insee_localite: '87085',
              cedex: null
            }
          }
        }
      }),
      getNombreCnfs: () => 3
    };

    const structureId = '62a46ca2af2829d3cd298305';

    const expectedPermanenceDetails = {
      adresse: '12 RUE DE LA PLACE, 87100 LIMOGES',
      nom: 'Aide rurale',
      telephone: '04 23 45 68 97',
      nombreCnfs: 3
    };

    const details = await permanenceDetails(structureId, permanenceRepository);

    expect(details).toStrictEqual(expectedPermanenceDetails);
  });
});
