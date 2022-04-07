const { formatAddressFromInsee } = require('./format-address');

describe('format address', () => {
  it('should convert a complete insee address to a human readable address', () => {
    const inseeAddress = {
      l1: 'Association pour la formation au numérique à Bessenay',
      l2: null,
      l3: null,
      l4: '6 rue de la Mairie',
      l5: null,
      l6: '69690 Bessenay',
      l7: 'France',
      numero_voie: '6',
      type_voie: 'rue',
      nom_voie: 'de la Mairie',
      complement_adresse: null,
      code_postal: '69690',
      localite: 'Bessenay',
      code_insee_localite: '69194',
      cedex: null
    };
    const expectedAddress = '6 rue de la Mairie, 69690 Bessenay';

    const address = formatAddressFromInsee(inseeAddress);

    expect(address).toStrictEqual(expectedAddress);
  });

  it('should convert a partial insee address to a human readable address', () => {
    const inseeAddress = {
      l1: 'Les artisans du numérique',
      l2: 'ZI les deux clochers',
      l3: '62300, Lens',
      numero_voie: null,
      type_voie: null,
      nom_voie: null,
      complement_adresse: 'ZI les deux clochers',
      code_postal: '62300',
      localite: 'Lens',
      code_insee_localite: '62072',
      cedex: null
    };
    const expectedAddress = 'ZI les deux clochers, 62300 Lens';

    const address = formatAddressFromInsee(inseeAddress);

    expect(address).toStrictEqual(expectedAddress);
  });
});
