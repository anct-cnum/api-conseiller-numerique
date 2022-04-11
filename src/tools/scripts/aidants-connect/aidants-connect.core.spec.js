const { findCommonSiret } = require('./aidants-connect.core');

describe('aidants connect', () => {
  it('devrait ne trouver aucun siret en commun quand les deux listes sont vides', () => {
    const expectedCommonSiret = [];

    const siretList1 = [];
    const siretList2 = [];

    const commonSiretCount = findCommonSiret(siretList1, siretList2);

    expect(commonSiretCount).toStrictEqual(expectedCommonSiret);
  });

  it('devrait trouver un siret en commun entre les deux listes', () => {
    const expectedCommonSiret = ['21690096900017'];

    const siretList1 = ['21690096900017'];
    const siretList2 = ['21690096900017', '84162859700012'];

    const commonSiretCount = findCommonSiret(siretList1, siretList2);

    expect(commonSiretCount).toStrictEqual(expectedCommonSiret);
  });

  it('devrait trouver plusieurs siret en commun entre les deux listes', () => {
    const expectedCommonSiret = ['84162859700012', '21690096900017'];

    const siretList1 = ['84162859700012', '21690096900017', '85412369700017'];
    const siretList2 = ['21690096900017', '84162859700012', '69984155800015'];

    const commonSiretCount = findCommonSiret(siretList1, siretList2);

    expect(commonSiretCount).toStrictEqual(expectedCommonSiret);
  });
});
