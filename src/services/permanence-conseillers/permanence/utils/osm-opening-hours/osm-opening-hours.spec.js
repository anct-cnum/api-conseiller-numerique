const { toOsmOpeningHours } = require('./osm-opening-hours');

describe('osm opening hours', () => {
  it('devrait convertir les horaires au format OSM pour une permanence qui n\'ouvre aucun jour de la semaine', () => {
    const openingHours = [];

    const osmOpeningHours = toOsmOpeningHours(openingHours);

    expect(osmOpeningHours).toStrictEqual('');
  });

  it('devrait convertir les horaires au format OSM pour une permanence qui ouvre le lundi matin de 10h à 12h', () => {
    const openingHours = [
      {
        day: 'Mo',
        osmHours: '10:00-12:00'
      }
    ];

    const osmOpeningHours = toOsmOpeningHours(openingHours);

    expect(osmOpeningHours).toStrictEqual('Mo 10:00-12:00');
  });

  it('devrait convertir les horaires au format OSM pour une permanence qui ouvre le lundi après-midi de 14h à 18h', () => {
    const openingHours = [
      {
        day: 'Mo',
        osmHours: '14:00-18:00'
      }
    ];

    const osmOpeningHours = toOsmOpeningHours(openingHours);

    expect(osmOpeningHours).toStrictEqual('Mo 14:00-18:00');
  });

  it('devrait convertir les horaires au format OSM pour une permanence qui ouvre le lundi matin de 10h à 12h et le mardi après-midi de 14h à 18h', () => {
    const openingHours = [
      {
        day: 'Mo',
        osmHours: '10:00-12:00,14:00-18:00'
      }
    ];

    const osmOpeningHours = toOsmOpeningHours(openingHours);

    expect(osmOpeningHours).toStrictEqual('Mo 10:00-12:00,14:00-18:00');
  });

  it('devrait convertir les horaires au format OSM pour une permanence qui ouvre tous les jours à des heures différentes', () => {
    const openingHours = [
      {
        day: 'Mo',
        osmHours: '09:30-10:45'
      },
      {
        day: 'Tu',
        osmHours: '11:15-12:45'
      },
      {
        day: 'We',
        osmHours: '13:30-14:25'
      },
      {
        day: 'Th',
        osmHours: '8:00-9:25,15:00-16:05'
      },
      {
        day: 'Fr',
        osmHours: '16:20-17:15'
      },
      {
        day: 'Sa',
        osmHours: '18:30-19:00'
      },
      {
        day: 'Su',
        osmHours: '19:50-23:55'
      }
    ];

    const osmOpeningHours = toOsmOpeningHours(openingHours);

    // eslint-disable-next-line max-len
    expect(osmOpeningHours).toStrictEqual('Mo 09:30-10:45; Tu 11:15-12:45; We 13:30-14:25; Th 8:00-9:25,15:00-16:05; Fr 16:20-17:15; Sa 18:30-19:00; Su 19:50-23:55');
  });

  it('devrait convertir les horaires au format OSM pour une permanence qui ouvre du lundi au vendredi aux mêmes horaires', () => {
    const openingHours = [
      {
        day: 'Mo',
        osmHours: '8:00-12:00,15:00-18:00'
      },
      {
        day: 'Tu',
        osmHours: '8:00-12:00,15:00-18:00'
      },
      {
        day: 'We',
        osmHours: '8:00-12:00,15:00-18:00'
      },
      {
        day: 'Th',
        osmHours: '8:00-12:00,15:00-18:00'
      },
      {
        day: 'Fr',
        osmHours: '8:00-12:00,15:00-18:00'
      }
    ];

    const osmOpeningHours = toOsmOpeningHours(openingHours);

    expect(osmOpeningHours).toStrictEqual('Mo-Fr 8:00-12:00,15:00-18:00');
  });

  it('devrait convertir les horaires au format OSM pour une permanence qui ouvre du lundi au vendredi sauf le mercredi aux mêmes horaires', () => {
    const openingHours = [
      {
        day: 'Mo',
        osmHours: '8:00-12:00,15:00-18:00'
      },
      {
        day: 'Tu',
        osmHours: '8:00-12:00,15:00-18:00'
      },
      {
        day: 'Th',
        osmHours: '8:00-12:00,15:00-18:00'
      },
      {
        day: 'Fr',
        osmHours: '8:00-12:00,15:00-18:00'
      }
    ];

    const osmOpeningHours = toOsmOpeningHours(openingHours);

    expect(osmOpeningHours).toStrictEqual('Mo-Fr 8:00-12:00,15:00-18:00; We off');
  });

  it('devrait convertir les horaires au format OSM pour une permanence qui ouvre du lundi au vendredi sauf le mercredi et le jeudi', () => {
    const openingHours = [
      {
        day: 'Mo',
        osmHours: '8:00-12:00,15:00-18:00'
      },
      {
        day: 'Tu',
        osmHours: '8:00-12:00,15:00-18:00'
      },
      {
        day: 'Fr',
        osmHours: '8:00-12:00,15:00-18:00'
      }
    ];

    const osmOpeningHours = toOsmOpeningHours(openingHours);

    expect(osmOpeningHours).toStrictEqual('Mo-Fr 8:00-12:00,15:00-18:00; We,Th off');
  });

  it('devrait convertir les horaires au format OSM pour une permanence qui ouvre du lundi au vendredi sauf le mardi et le jeudi', () => {
    const openingHours = [
      {
        day: 'Mo',
        osmHours: '8:00-12:00,15:00-18:00'
      },
      {
        day: 'We',
        osmHours: '8:00-12:00,15:00-18:00'
      },
      {
        day: 'Fr',
        osmHours: '8:00-12:00,15:00-18:00'
      }
    ];

    const osmOpeningHours = toOsmOpeningHours(openingHours);

    expect(osmOpeningHours).toStrictEqual('Mo-Fr 8:00-12:00,15:00-18:00; Tu,Th off');
  });

  it('devrait convertir les horaires au format OSM pour une permanence qui ouvre du mardi au vendredi sauf le mercredi', () => {
    const openingHours = [
      {
        day: 'Tu',
        osmHours: '8:00-12:00,15:00-18:00'
      },
      {
        day: 'Th',
        osmHours: '8:00-12:00,15:00-18:00'
      },
      {
        day: 'Fr',
        osmHours: '8:00-12:00,15:00-18:00'
      }
    ];

    const osmOpeningHours = toOsmOpeningHours(openingHours);

    expect(osmOpeningHours).toStrictEqual('Tu-Fr 8:00-12:00,15:00-18:00; We off');
  });

  it('devrait convertir les horaires au format OSM pour une permanence qui ouvre tous les jours à la même heure', () => {
    const openingHours = [
      {
        day: 'Mo',
        osmHours: '8:00-12:00,15:00-18:00'
      },
      {
        day: 'Tu',
        osmHours: '8:00-12:00,15:00-18:00'
      },
      {
        day: 'We',
        osmHours: '8:00-12:00,15:00-18:00'
      },
      {
        day: 'Th',
        osmHours: '8:00-12:00,15:00-18:00'
      },
      {
        day: 'Fr',
        osmHours: '8:00-12:00,15:00-18:00'
      },
      {
        day: 'Sa',
        osmHours: '8:00-12:00,15:00-18:00'
      },
      {
        day: 'Su',
        osmHours: '8:00-12:00,15:00-18:00'
      }
    ];

    const osmOpeningHours = toOsmOpeningHours(openingHours);

    expect(osmOpeningHours).toStrictEqual('8:00-12:00,15:00-18:00');
  });

  it('devrait convertir les horaires au format OSM pour une permanence qui est fermée du jeudi au samedi', () => {
    const openingHours = [
      {
        day: 'Mo',
        osmHours: '8:00-12:00,15:00-18:00'
      },
      {
        day: 'Tu',
        osmHours: '8:00-12:00,15:00-18:00'
      },
      {
        day: 'We',
        osmHours: '8:00-12:00,15:00-18:00'
      },
      {
        day: 'Su',
        osmHours: '8:00-12:00,15:00-18:00'
      }
    ];

    const osmOpeningHours = toOsmOpeningHours(openingHours);

    expect(osmOpeningHours).toStrictEqual('8:00-12:00,15:00-18:00; Th-Sa off');
  });

  it('devrait convertir les horaires au format OSM pour une permanence qui est ouverte sur deux périodes', () => {
    const openingHours = [
      {
        day: 'We',
        osmHours: '10:00-12:00,14:00-18:00'
      },
      {
        day: 'Th',
        osmHours: '13:30-18:00'
      },
      {
        day: 'Fr',
        osmHours: '13:30-18:00'
      },
      {
        day: 'Sa',
        osmHours: '10:00-12:00,14:00-18:00'
      }
    ];

    const osmOpeningHours = toOsmOpeningHours(openingHours);

    expect(osmOpeningHours).toStrictEqual('We,Sa 10:00-12:00,14:00-18:00; Th,Fr 13:30-18:00');
  });

  it('devrait convertir les horaires au format OSM pour une permanence qui est ouverte en continue certains jours', () => {
    const openingHours = [
      {
        day: 'Mo',
        osmHours: '7:30-16:30'
      },
      {
        day: 'Tu',
        osmHours: '7:30-14:30'
      },
      {
        day: 'We',
        osmHours: '7:30-14:30'
      },
      {
        day: 'Th',
        osmHours: '7:30-16:30'
      },
      {
        day: 'Fr',
        osmHours: '7:30-12:30'
      }
    ];

    const osmOpeningHours = toOsmOpeningHours(openingHours);

    expect(osmOpeningHours).toStrictEqual('Mo,Th 7:30-16:30; Tu,We 7:30-14:30; Fr 7:30-12:30');
  });

  it('devrait convertir les horaires au format OSM pour une permanence en tenant compte de l\'ordre des jours', () => {
    const openingHours = [
      {
        day: 'Mo',
        osmHours: '09:00-12:00,14:30-17:00'
      },
      {
        day: 'Tu',
        osmHours: '09:00-12:00,14:30-17:30'
      },
      {
        day: 'We',
        osmHours: '09:00-12:00,14:00-17:00'
      },
      {
        day: 'Th',
        osmHours: '09:00-12:00,14:30-17:30'
      },
      {
        day: 'Fr',
        osmHours: '09:00-12:00,14:30-17:30'
      },
      {
        day: 'Sa',
        osmHours: '09:00-12:00'
      }
    ];

    const osmOpeningHours = toOsmOpeningHours(openingHours);

    expect(osmOpeningHours).toStrictEqual('Tu-Fr 09:00-12:00,14:30-17:30; Mo 09:00-12:00,14:30-17:00; We 09:00-12:00,14:00-17:00; Sa 09:00-12:00');
  });

  it('devrait convertir les horaires au format OSM pour une permanence avec une plage horaire des horaires spécifiques et un jour off', () => {
    const openingHours = [
      {
        day: 'Mo',
        osmHours: '16:00-18:30'
      },
      {
        day: 'Tu',
        osmHours: '16:00-18:30'
      },
      {
        day: 'We',
        osmHours: '09:30-12:00,14:00-18:30'
      },
      {
        day: 'Fr',
        osmHours: '16:00-18:30'
      },
      {
        day: 'Sa',
        osmHours: '09:30-12:30,14:00-17:30'
      }
    ];

    const osmOpeningHours = toOsmOpeningHours(openingHours);

    expect(osmOpeningHours).toStrictEqual('Mo-Fr 16:00-18:30; We 09:30-12:00,14:00-18:30; Sa 09:30-12:30,14:00-17:30; Th off');
  });

  it('devrait convertir les horaires au format OSM pour une permanence avec 3 jours aux mêmes horaires sans plage horaire', () => {
    const openingHours = [
      {
        day: 'Mo',
        osmHours: '14:00-18:00'
      },
      {
        day: 'Tu',
        osmHours: '09:00-12:00,14:00-18:00'
      },
      {
        day: 'We',
        osmHours: '09:00-12:00,14:00-18:00'
      },
      {
        day: 'Th',
        osmHours: '14:00-18:00'
      },
      {
        day: 'Fr',
        osmHours: '09:00-12:00,14:00-18:00'
      }
    ];

    const osmOpeningHours = toOsmOpeningHours(openingHours);

    expect(osmOpeningHours).toStrictEqual('Tu-Fr 09:00-12:00,14:00-18:00; Mo,Th 14:00-18:00');
  });

  it('devrait convertir les horaires au format OSM pour une permanence avec deux plages horaires', () => {
    const openingHours = [
      {
        day: 'Mo',
        osmHours: '09:00-12:00'
      },
      {
        day: 'Tu',
        osmHours: '09:00-12:00'
      },
      {
        day: 'We',
        osmHours: '09:00-12:00,14:00-18:00'
      },
      {
        day: 'Th',
        osmHours: '09:00-12:00,14:00-18:00'
      },
      {
        day: 'Fr',
        osmHours: '09:00-12:00,14:00-18:00'
      },
      {
        day: 'Sa',
        osmHours: '09:00-12:00'
      }
    ];

    const osmOpeningHours = toOsmOpeningHours(openingHours);

    expect(osmOpeningHours).toStrictEqual('Mo-Sa 09:00-12:00; We-Fr 09:00-12:00,14:00-18:00'); // (89)
  });
});
