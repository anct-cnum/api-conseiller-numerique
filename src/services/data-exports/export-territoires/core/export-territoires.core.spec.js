const { getStatsTerritoires } = require('./export-territoires.core');

describe('export territoires core', () => {
  const ordre = 1;
  const dateDebut = new Date(2021, 5, 1);
  const dateFin = new Date(2021, 7, 1);

  const getPersonnesAccompagneesEmpty = () => [];
  const getPersonnesAccompagnees = () => [{ count: 42 }];

  const getStatsTerritoiresForDepartementEmpty = () => [];
  const getStatsTerritoiresForDepartementSingleValueWithConseillerIds = () => [
    {
      _id: '12343777f560927678653890',
      date: '01/11/2021',
      nombreConseillersCoselec: 8,
      cnfsActives: 0,
      cnfsInactives: 12,
      conseillerIds: [
        'eec4541fc4e5ca84e7ff4e5f1e'
      ],
      codeDepartement: '04',
      codeRegion: '93',
      nomDepartement: 'Alpes-de-Haute-Provence',
      nomRegion: 'Provence-Alpes-Côte d\'Azur',
      tauxActivation: 0
    }
  ];
  const getStatsTerritoiresForDepartementSingleValueWithoutConseillerIds = () => [
    {
      _id: '12343777f560927678653890',
      date: '01/11/2021',
      nombreConseillersCoselec: 8,
      cnfsActives: 0,
      cnfsInactives: 12,
      conseillerIds: [],
      codeDepartement: '04',
      codeRegion: '93',
      nomDepartement: 'Alpes-de-Haute-Provence',
      nomRegion: 'Provence-Alpes-Côte d\'Azur',
      tauxActivation: 0
    }
  ];

  const getStatsTerritoiresForRegionEmpty = () => [];
  const getStatsTerritoiresForRegionSingleValueWithConseillerIds = () => [
    {
      _id: {
        codeRegion: '02',
        nomRegion: 'Martinique'
      },
      nombreConseillersCoselec: 43,
      cnfsActives: 22,
      cnfsInactives: 21,
      conseillerIds: [
        ['cea5z61f6az81efzce65z6e5f1']
      ],
      codeRegion: '02',
      nomRegion: 'Martinique'
    }
  ];
  const getStatsTerritoiresForRegionSingleValueWithoutConseillerIds = () => [
    {
      _id: {
        codeRegion: '02',
        nomRegion: 'Martinique'
      },
      nombreConseillersCoselec: 43,
      cnfsActives: 22,
      cnfsInactives: 21,
      conseillerIds: [],
      codeRegion: '02',
      nomRegion: 'Martinique'
    }
  ];
  const getStatsTerritoiresForRegionSingleValueWithoutNombreConseillersCoselec = () => [
    {
      _id: {
        codeRegion: '02',
        nomRegion: 'Martinique'
      },
      cnfsActives: 22,
      cnfsInactives: 21,
      conseillerIds: [],
      codeRegion: '02',
      nomRegion: 'Martinique'
    }
  ];


  it('should get empty stats territoires when the collection of stats territoires for departement is empty', async () => {
    const territoire = 'codeDepartement';
    const nomOrdre = 'codeCodeDepartement';

    const statsTerritoires = await getStatsTerritoires({
      territoire,
      nomOrdre,
      ordre,
      dateDebut,
      dateFin,
    }, {
      getStatsTerritoiresForDepartement: getStatsTerritoiresForDepartementEmpty,
      getStatsTerritoiresForRegion: getStatsTerritoiresForRegionEmpty,
      getPersonnesAccompagnees: getPersonnesAccompagneesEmpty
    });

    expect(statsTerritoires).toEqual([]);
  });

  it('should get stats territoires with conseiller ids and without personnes accompagnees for departement', async () => {
    const territoire = 'codeDepartement';
    const nomOrdre = 'codeCodeDepartement';

    const statsTerritoires = await getStatsTerritoires({
      territoire,
      nomOrdre,
      ordre,
      dateDebut,
      dateFin,
    }, {
      getStatsTerritoiresForDepartement: getStatsTerritoiresForDepartementSingleValueWithConseillerIds,
      getStatsTerritoiresForRegion: getStatsTerritoiresForRegionEmpty,
      getPersonnesAccompagnees: getPersonnesAccompagneesEmpty
    });

    expect(statsTerritoires).toEqual([
      {
        _id: '12343777f560927678653890',
        cnfsActives: 0,
        cnfsInactives: 12,
        codeDepartement: '04',
        codeRegion: '93',
        conseillerIds: [
          'eec4541fc4e5ca84e7ff4e5f1e'
        ],
        date: '01/11/2021',
        nomDepartement: 'Alpes-de-Haute-Provence',
        nomRegion: 'Provence-Alpes-Côte d\'Azur',
        nombreConseillersCoselec: 8,
        personnesAccompagnees: 0,
        tauxActivation: 0
      }
    ]);
  });

  it('should get stats territoires with conseiller ids and with personnes accompagnees for departement', async () => {
    const territoire = 'codeDepartement';
    const nomOrdre = 'codeCodeDepartement';

    const statsTerritoires = await getStatsTerritoires({
      territoire,
      nomOrdre,
      ordre,
      dateDebut,
      dateFin,
    }, {
      getStatsTerritoiresForDepartement: getStatsTerritoiresForDepartementSingleValueWithConseillerIds,
      getStatsTerritoiresForRegion: getStatsTerritoiresForRegionEmpty,
      getPersonnesAccompagnees: getPersonnesAccompagnees
    });

    expect(statsTerritoires).toEqual([
      {
        _id: '12343777f560927678653890',
        cnfsActives: 0,
        cnfsInactives: 12,
        codeDepartement: '04',
        codeRegion: '93',
        conseillerIds: [
          'eec4541fc4e5ca84e7ff4e5f1e'
        ],
        date: '01/11/2021',
        nomDepartement: 'Alpes-de-Haute-Provence',
        nomRegion: 'Provence-Alpes-Côte d\'Azur',
        nombreConseillersCoselec: 8,
        personnesAccompagnees: 42,
        tauxActivation: 0
      }
    ]);
  });

  it('should get stats territoires without conseiller ids and with personnes accompagnees for departement', async () => {
    const territoire = 'codeDepartement';
    const nomOrdre = 'codeCodeDepartement';

    const statsTerritoires = await getStatsTerritoires({
      territoire,
      nomOrdre,
      ordre,
      dateDebut,
      dateFin,
    }, {
      getStatsTerritoiresForDepartement: getStatsTerritoiresForDepartementSingleValueWithoutConseillerIds,
      getStatsTerritoiresForRegion: getStatsTerritoiresForRegionEmpty,
      getPersonnesAccompagnees: getPersonnesAccompagnees
    });

    expect(statsTerritoires).toEqual([
      {
        _id: '12343777f560927678653890',
        cnfsActives: 0,
        cnfsInactives: 12,
        codeDepartement: '04',
        codeRegion: '93',
        conseillerIds: [],
        date: '01/11/2021',
        nomDepartement: 'Alpes-de-Haute-Provence',
        nomRegion: 'Provence-Alpes-Côte d\'Azur',
        nombreConseillersCoselec: 8,
        personnesAccompagnees: 0,
        tauxActivation: 0
      }
    ]);
  });

  it('should get empty stats territoires when the collection of stats territoires for region is empty', async () => {
    const territoire = 'codeRegion';
    const nomOrdre = 'codeCodeRegion';

    const statsTerritoires = await getStatsTerritoires({
      territoire,
      nomOrdre,
      ordre,
      dateDebut,
      dateFin,
    }, {
      getStatsTerritoiresForDepartement: getStatsTerritoiresForDepartementEmpty,
      getStatsTerritoiresForRegion: getStatsTerritoiresForRegionEmpty,
      getPersonnesAccompagnees: getPersonnesAccompagneesEmpty
    });

    expect(statsTerritoires).toEqual([]);
  });

  it('should get stats territoires with conseiller ids and without personnes accompagnees for region', async () => {
    const territoire = 'codeRegion';
    const nomOrdre = 'codeCodeRegion';

    const statsTerritoires = await getStatsTerritoires({
      territoire,
      nomOrdre,
      ordre,
      dateDebut,
      dateFin,
    }, {
      getStatsTerritoiresForDepartement: getStatsTerritoiresForDepartementEmpty,
      getStatsTerritoiresForRegion: getStatsTerritoiresForRegionSingleValueWithConseillerIds,
      getPersonnesAccompagnees: getPersonnesAccompagneesEmpty
    });

    expect(statsTerritoires).toEqual([
      {
        _id: {
          codeRegion: '02',
          nomRegion: 'Martinique'
        },
        cnfsActives: 22,
        cnfsInactives: 21,
        codeRegion: '02',
        conseillerIds: [
          ['cea5z61f6az81efzce65z6e5f1']
        ],
        nomRegion: 'Martinique',
        nombreConseillersCoselec: 43,
        personnesAccompagnees: 0,
        tauxActivation: 51
      }
    ]);
  });

  it('should get stats territoires with conseiller ids and with personnes accompagnees for region', async () => {
    const territoire = 'codeRegion';
    const nomOrdre = 'codeCodeRegion';

    const statsTerritoires = await getStatsTerritoires({
      territoire,
      nomOrdre,
      ordre,
      dateDebut,
      dateFin,
    }, {
      getStatsTerritoiresForDepartement: getStatsTerritoiresForDepartementEmpty,
      getStatsTerritoiresForRegion: getStatsTerritoiresForRegionSingleValueWithConseillerIds,
      getPersonnesAccompagnees: getPersonnesAccompagnees
    });

    expect(statsTerritoires).toEqual([
      {
        _id: {
          codeRegion: '02',
          nomRegion: 'Martinique'
        },
        cnfsActives: 22,
        cnfsInactives: 21,
        codeRegion: '02',
        conseillerIds: [
          ['cea5z61f6az81efzce65z6e5f1']
        ],
        nomRegion: 'Martinique',
        nombreConseillersCoselec: 43,
        personnesAccompagnees: 42,
        tauxActivation: 51
      }
    ]);
  });

  it('should get stats territoires without conseiller ids and with personnes accompagnees for region', async () => {
    const territoire = 'codeRegion';
    const nomOrdre = 'codeCodeRegion';

    const statsTerritoires = await getStatsTerritoires({
      territoire,
      nomOrdre,
      ordre,
      dateDebut,
      dateFin,
    }, {
      getStatsTerritoiresForDepartement: getStatsTerritoiresForDepartementEmpty,
      getStatsTerritoiresForRegion: getStatsTerritoiresForRegionSingleValueWithoutConseillerIds,
      getPersonnesAccompagnees: getPersonnesAccompagnees
    });

    expect(statsTerritoires).toEqual([
      {
        _id: {
          codeRegion: '02',
          nomRegion: 'Martinique'
        },
        cnfsActives: 22,
        cnfsInactives: 21,
        codeRegion: '02',
        conseillerIds: [],
        nomRegion: 'Martinique',
        nombreConseillersCoselec: 43,
        personnesAccompagnees: 0,
        tauxActivation: 51
      }
    ]);
  });

  it('should get stats territoires without nombre conseillers coselec for region', async () => {
    const territoire = 'codeRegion';
    const nomOrdre = 'codeCodeRegion';

    const statsTerritoires = await getStatsTerritoires({
      territoire,
      nomOrdre,
      ordre,
      dateDebut,
      dateFin,
    }, {
      getStatsTerritoiresForDepartement: getStatsTerritoiresForDepartementEmpty,
      getStatsTerritoiresForRegion: getStatsTerritoiresForRegionSingleValueWithoutNombreConseillersCoselec,
      getPersonnesAccompagnees: getPersonnesAccompagneesEmpty
    });

    expect(statsTerritoires).toEqual([
      {
        _id: {
          codeRegion: '02',
          nomRegion: 'Martinique'
        },
        cnfsActives: 22,
        cnfsInactives: 21,
        codeRegion: '02',
        conseillerIds: [],
        nomRegion: 'Martinique',
        personnesAccompagnees: 0,
        tauxActivation: 0
      }
    ]);
  });
});
