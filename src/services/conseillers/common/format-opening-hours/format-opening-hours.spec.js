const { formatOpeningHours } = require('./format-opening-hours');

describe('format opening hours', () => {
  it('devrait convertir les horaires d\'ouverture dans le format d\'affichage', () => {
    const openingHoursToFormat = [
      {
        matin: [
          '8:00',
          '12:30'
        ],
        apresMidi: [
          '13:30',
          '18:00'
        ]
      },
      {
        matin: [
          '8:00',
          '12:30'
        ],
        apresMidi: [
          '13:30',
          '18:00'
        ]
      },
      {
        matin: [
          '8:00',
          '12:30'
        ],
        apresMidi: [
          '13:30',
          '18:00'
        ]
      },
      {
        matin: [
          '8:00',
          '12:30'
        ],
        apresMidi: [
          '13:30',
          '18:00'
        ]
      },
      {
        matin: [
          '8:00',
          '12:30'
        ],
        apresMidi: [
          '13:30',
          '18:00'
        ]
      },
      {
        matin: [
          'Fermé',
          'Fermé'
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
          'Fermé',
          'Fermé'
        ]
      }
    ];

    const expectedOpeningHours = [
      '8h00 - 12h30 | 13h30 - 18h00',
      '8h00 - 12h30 | 13h30 - 18h00',
      '8h00 - 12h30 | 13h30 - 18h00',
      '8h00 - 12h30 | 13h30 - 18h00',
      '8h00 - 12h30 | 13h30 - 18h00',
      '',
      ''
    ];

    const openingHours = formatOpeningHours(openingHoursToFormat);

    expect(openingHours).toStrictEqual(expectedOpeningHours);
  });
});
