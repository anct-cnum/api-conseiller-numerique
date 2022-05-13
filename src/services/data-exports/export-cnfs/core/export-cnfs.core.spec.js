const { getStatsCnfs } = require('./export-cnfs.core');

const getStatsCnfsEmpty = () => [];
const getStatsCnfsNoUserActifSingleValue = () => [
  {
    prenom: 'John',
    nom: 'Doe',
    structureId: '98dbc77b988c970031479ba1',
    emailStructure: undefined,
    adresseStructure: '    ',
    codeDepartement: undefined,
    codePostal: 69005,
    datePrisePoste: '2021-01-27T22:00:00.000Z',
    dateFinFormation: '2021-03-12T22:00:00.000Z',
    groupeCRA: 0,
    groupeCRAHistorique: [{ numero: 0, dateDeChangement: '2022-04-25T09:35:15.699Z' }],
    emailCNError: undefined,
    mattermost: undefined
  }
];
const getStatsCnfsUserActifSingleValue = () => [
  {
    prenom: 'John',
    nom: 'Doe',
    structureId: '98dbc77b988c970031479ba1',
    nomStructure: 'Association pour l\'accès au numérique',
    emailStructure: undefined,
    adresseStructure: '     ',
    codeDepartement: undefined,
    codePostal: 69005,
    datePrisePoste: '2021-01-27T22:00:00.000Z',
    dateFinFormation: '2021-03-12T22:00:00.000Z',
    groupeCRA: 0,
    groupeCRAHistorique: [{ numero: 0, dateDeChangement: '2022-04-25T09:35:15.699Z' }],
    emailCNError: false,
    mattermost: {
      error: false,
      login: 'john.doe',
      id: '9sd4fg566v5bs4h84er9t98dhs',
      hubJoined: true
    }
  }
];
const getStatsCnfsNoStructureIdSingleValue = () => [
  {
    prenom: 'John',
    nom: 'Doe',
    codePostal: 69005,
    datePrisePoste: '2021-01-27T22:00:00.000Z',
    dateFinFormation: '2021-03-12T22:00:00.000Z',
    groupeCRA: 0,
    groupeCRAHistorique: [{ numero: 0, dateDeChangement: '2022-04-25T09:35:15.699Z' }],
    emailCNError: undefined,
    mattermost: undefined
  }
];
const getStructureNameFromId = () => ({
  nom: 'Association pour l\'accès au numérique'
});

describe('export cnfs core', () => {
  it('should get empty stats cnfs when the collection of stats cnfs is empty', async () => {
    const statsTerritoires = await getStatsCnfs({}, {
      getStatsCnfs: getStatsCnfsEmpty,
    });

    expect(statsTerritoires).toEqual([]);
  });

  it('should get single stats cnfs when the collection of stats cnfs contains one element without email cn error and mattermost account', async () => {
    const statsTerritoires = await getStatsCnfs({}, {
      getStatsCnfs: getStatsCnfsNoUserActifSingleValue,
      getStructureNameFromId: getStructureNameFromId,
    });

    expect(statsTerritoires).toEqual([
      {
        prenom: 'John',
        nom: 'Doe',
        structureId: '98dbc77b988c970031479ba1',
        nomStructure: 'Association pour l\'accès au numérique',
        emailStructure: undefined,
        adresseStructure: '     ',
        codeDepartement: undefined,
        codePostal: 69005,
        datePrisePoste: '27/01/2021',
        dateFinFormation: '12/03/2021',
        groupeCRA: 0,
        groupeCRAHistorique: '[{"numero":0,"dateDeChangement":"2022-04-25T09:35:15.699Z"}]',
        certifie: 'Non',
        isUserActif: 'Non'
      }
    ]);
  });

  it('should get single stats cnfs when the collection of stats cnfs contains one element with email cn error and mattermost account', async () => {
    const statsTerritoires = await getStatsCnfs({}, {
      getStatsCnfs: getStatsCnfsUserActifSingleValue,
      getStructureNameFromId: getStructureNameFromId,
    });

    expect(statsTerritoires).toEqual([
      {
        prenom: 'John',
        nom: 'Doe',
        structureId: '98dbc77b988c970031479ba1',
        nomStructure: 'Association pour l\'accès au numérique',
        emailStructure: undefined,
        adresseStructure: '     ',
        codeDepartement: undefined,
        codePostal: 69005,
        datePrisePoste: '27/01/2021',
        dateFinFormation: '12/03/2021',
        groupeCRA: 0,
        groupeCRAHistorique: '[{"numero":0,"dateDeChangement":"2022-04-25T09:35:15.699Z"}]',
        certifie: 'Non',
        isUserActif: 'Oui'
      }
    ]);
  });

  it('should get single stats cnfs without name when the collection of stats cnfs contains one element and there is no matching structure', async () => {
    const statsTerritoires = await getStatsCnfs({}, {
      getStatsCnfs: getStatsCnfsNoStructureIdSingleValue,
      getStructureNameFromId: getStructureNameFromId,
    });

    expect(statsTerritoires).toEqual([
      {
        prenom: 'John',
        nom: 'Doe',
        nomStructure: '',
        adresseStructure: '',
        emailStructure: '',
        codeDepartement: '',
        codePostal: 69005,
        datePrisePoste: '27/01/2021',
        dateFinFormation: '12/03/2021',
        groupeCRA: 0,
        groupeCRAHistorique: '[{"numero":0,"dateDeChangement":"2022-04-25T09:35:15.699Z"}]',
        certifie: 'Non',
        isUserActif: 'Non'
      }
    ]);
  });
});
