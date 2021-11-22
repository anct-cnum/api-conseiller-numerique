const { getStatistiquesToExport } = require('./export-statistiques.core');

const getConseillerById = () => ({
  prenom: 'John',
  nom: 'Doe',
});

const statistiquesConseiller = {
  nbAccompagnement: 23,
  nbAteliers: 0,
  nbTotalParticipant: 0,
  nbAccompagnementPerso: 10,
  nbDemandePonctuel: 13,
  nbUsagersAccompagnementIndividuel: 11,
  nbUsagersAtelierCollectif: 0,
  nbReconduction: 10,
  nbUsagersBeneficiantSuivi: 21,
  tauxTotalUsagersAccompagnes: 91,
  statsThemes: [
    {
      nom: 'equipement informatique',
      valeur: 13
    },
    {
      nom: 'internet',
      valeur: 9
    },
    {
      nom: 'courriel',
      valeur: 8
    },
    {
      nom: 'smartphone',
      valeur: 2
    },
    {
      nom: 'contenus numeriques',
      valeur: 8
    },
    {
      nom: 'vocabulaire',
      valeur: 4
    },
    {
      nom: 'traitement texte',
      valeur: 8
    },
    {
      nom: 'echanger',
      valeur: 0
    },
    {
      nom: 'trouver emploi',
      valeur: 21
    },
    {
      nom: 'accompagner enfant',
      valeur: 0
    },
    {
      nom: 'tpe/pme',
      valeur: 0
    },
    {
      nom: 'demarche en ligne',
      valeur: 21
    },
    {
      nom: 'autre',
      valeur: 13
    }
  ],
  statsLieux: [
    {
      nom: 'domicile',
      valeur: 0
    },
    {
      nom: 'distance',
      valeur: 0
    },
    {
      nom: 'rattachement',
      valeur: 23
    },
    {
      nom: 'autre',
      valeur: 0
    }
  ],
  statsDurees: [
    {
      nom: '0-30',
      valeur: 4
    },
    {
      nom: '30-60',
      valeur: 16
    },
    {
      nom: '60-120',
      valeur: 3
    },
    {
      nom: '120+',
      valeur: 0
    }
  ],
  statsAges: [
    {
      nom: '-12',
      valeur: 0
    },
    {
      nom: '12-18',
      valeur: 4
    },
    {
      nom: '18-35',
      valeur: 86
    },
    {
      nom: '35-60',
      valeur: 4
    },
    {
      nom: '+60',
      valeur: 4
    }
  ],
  statsUsagers: [
    {
      nom: 'etudiant',
      valeur: 4
    },
    {
      nom: 'sans emploi',
      valeur: 91
    },
    {
      nom: 'en emploi',
      valeur: 0
    },
    {
      nom: 'retraite',
      valeur: 4
    },
    {
      nom: 'heterogene',
      valeur: 0
    }
  ],
  statsEvolutions: {
    2021: [
      {
        _id: 6,
        totalCras: 485,
        mois: 6,
        annee: 2021
      },
      {
        _id: 9,
        totalCras: 8438,
        mois: 9,
        annee: 2021
      },
      {
        _id: 7,
        totalCras: 1476,
        mois: 7,
        annee: 2021
      },
      {
        _id: 8,
        totalCras: 4022,
        mois: 8,
        annee: 2021
      },
      {
        _id: 10,
        totalCras: 430,
        mois: 10,
        annee: 2021
      }
    ]
  }
};

const statistiquesNationales = {
  nbAccompagnement: 230,
  nbAteliers: 0,
  nbTotalParticipant: 0,
  nbAccompagnementPerso: 100,
  nbDemandePonctuel: 130,
  nbUsagersAccompagnementIndividuel: 110,
  nbUsagersAtelierCollectif: 0,
  nbReconduction: 100,
  nbUsagersBeneficiantSuivi: 210,
  tauxTotalUsagersAccompagnes: 91,
  statsThemes: [
    {
      nom: 'equipement informatique',
      valeur: 130
    },
    {
      nom: 'internet',
      valeur: 90
    },
    {
      nom: 'courriel',
      valeur: 80
    },
    {
      nom: 'smartphone',
      valeur: 20
    },
    {
      nom: 'contenus numeriques',
      valeur: 80
    },
    {
      nom: 'vocabulaire',
      valeur: 40
    },
    {
      nom: 'traitement texte',
      valeur: 80
    },
    {
      nom: 'echanger',
      valeur: 0
    },
    {
      nom: 'trouver emploi',
      valeur: 210
    },
    {
      nom: 'accompagner enfant',
      valeur: 0
    },
    {
      nom: 'tpe/pme',
      valeur: 0
    },
    {
      nom: 'demarche en ligne',
      valeur: 210
    },
    {
      nom: 'autre',
      valeur: 130
    }
  ],
  statsLieux: [
    {
      nom: 'domicile',
      valeur: 0
    },
    {
      nom: 'distance',
      valeur: 0
    },
    {
      nom: 'rattachement',
      valeur: 230
    },
    {
      nom: 'autre',
      valeur: 0
    }
  ],
  statsDurees: [
    {
      nom: '0-30',
      valeur: 40
    },
    {
      nom: '30-60',
      valeur: 160
    },
    {
      nom: '60-120',
      valeur: 30
    },
    {
      nom: '120+',
      valeur: 0
    }
  ],
  statsAges: [
    {
      nom: '-12',
      valeur: 0
    },
    {
      nom: '12-18',
      valeur: 4
    },
    {
      nom: '18-35',
      valeur: 86
    },
    {
      nom: '35-60',
      valeur: 4
    },
    {
      nom: '+60',
      valeur: 4
    }
  ],
  statsUsagers: [
    {
      nom: 'etudiant',
      valeur: 4
    },
    {
      nom: 'sans emploi',
      valeur: 91
    },
    {
      nom: 'en emploi',
      valeur: 0
    },
    {
      nom: 'retraite',
      valeur: 4
    },
    {
      nom: 'heterogene',
      valeur: 0
    }
  ],
  statsEvolutions: {
    2021: [
      {
        _id: 6,
        totalCras: 4850,
        mois: 6,
        annee: 2021
      },
      {
        _id: 9,
        totalCras: 84380,
        mois: 9,
        annee: 2021
      },
      {
        _id: 7,
        totalCras: 14760,
        mois: 7,
        annee: 2021
      },
      {
        _id: 8,
        totalCras: 40220,
        mois: 8,
        annee: 2021
      },
      {
        _id: 10,
        totalCras: 4300,
        mois: 10,
        annee: 2021
      }
    ]
  }
};

const getStatsConseiller = () => statistiquesConseiller;

const getStatsNationales = () => statistiquesNationales;

describe('export statistiques core', () => {
  it('devrait exporter les statistiques d\'un conseiller', async () => {
    const dateDebut = new Date('2021-01-01T00:00:00.000Z');
    const dateFin = new Date('2021-11-18T00:00:00.000Z');
    const conseillerId = '4a9bc1489ac8ba4c891b9a1c';
    const type = 'user';

    const statistiques = await getStatistiquesToExport(
      dateDebut, dateFin, conseillerId, type, {
        getConseillerById,
        getStatsConseiller,
        getStatsNationales
      }
    );

    expect(statistiques).toStrictEqual({
      stats: statistiquesConseiller,
      type: 'John Doe'
    });
  });

  it('devrait exporter les statistiques nationales', async () => {
    const dateDebut = new Date('2021-01-01T00:00:00.000Z');
    const dateFin = new Date('2021-11-18T00:00:00.000Z');
    const conseillerId = undefined;
    const type = 'nationale';

    const statistiques = await getStatistiquesToExport(
      dateDebut, dateFin, conseillerId, type, {
        getConseillerById,
        getStatsConseiller,
        getStatsNationales
      }
    );

    expect(statistiques).toStrictEqual({
      stats: statistiquesNationales,
      type: 'nationale'
    });
  });
});
