const { buildExportStatistiquesCsvFileContent } = require('./statistiques-accompagnement-csv');

describe('construction du contenu du fichier CSV d\'export des statistiques', () => {
  it('devrait retourner le contenu à partir des données statistiques', () => {
    const cnfsFullName = 'John Doe';
    const dateDebut = new Date('2021-01-01T00:00:00.000Z');
    const dateFin = new Date('2021-11-15T00:00:00.000Z');
    const statistiques = {
      nbParticipantsRecurrents: 3,
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
          nom: 'securite',
          valeur: 4
        },
        {
          nom: 'fraude et harcelement',
          valeur: 20
        },
        {
          nom: 'sante',
          valeur: 15
        },
        {
          nom: 'espace-sante',
          valeur: 1
        },
        {
          nom: 'scolaire',
          valeur: 4
        },
        {
          nom: 'diagnostic',
          valeur: 8
        },
        {
          nom: 'budget',
          valeur: 9
        },
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
          nom: 'autre lieu',
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
      },
      statsReorientations: [
        {
          nom: 'CEFS',
          valeur: 2
        },
        {
          nom: 'Assistante sociale',
          valeur: 9
        },
        {
          nom: 'Sous-préfecture',
          valeur: 2
        },
        {
          nom: 'Pôle emploi',
          valeur: 6
        },
        {
          nom: 'Port maritime',
          valeur: 11
        },
      ]
    };

    const idType = undefined;
    const codePostal = '';
    const isAdminCoop = false;

    const expectedFileContent =
      '\ufeff\n' +
      'Statistiques John Doe  false  01/01/2021-15/11/2021\n' +
      '\n' +
      'Général\n' +
      'Personnes totales accompagnées durant cette période;20\n' +
      'Accompagnements totaux enregistrés (dont récurrent);23\n' +
      'Ateliers réalisés;0\n' +
      'Total des participants aux ateliers;0\n' +
      'Accompagnements individuels;10\n' +
      'Demandes ponctuelles;13\n' +
      'Accompagnements avec suivi;21\n' +
      'Pourcentage du total des usagers accompagnés sur cette période;91\n' +
      'Accompagnements individuels;11\n' +
      'Accompagnements en atelier collectif;0\n' +
      'Redirections vers une autre structure agréée;10\n' +
      '\n' +
      'Thèmes des accompagnements\n' +
      'Prendre en main du matériel;13\n' +
      'Naviguer sur Internet;9\n' +
      'Courriels;8\n' +
      'Applications smartphone;2\n' +
      'Gestion de contenus numériques;8\n' +
      'Culture numérique;4\n' +
      'Bureautique;8\n' +
      'Échanger avec ses proches;0\n' +
      'Emploi et formation;21\n' +
      'Accompagner un aidant;0\n' +
      'Numérique et TPE/PME;0\n' +
      'Démarche en ligne;21\n' +
      'Sécuriser un équipement;4\n' +
      'Fraude et harcèlement;20\n' +
      'Santé;15\n' +
      'Mon espace santé;1\n' +
      'Scolaire;4\n' +
      'Diagnostic numérique;8\n' +
      'Budget;9\n' +
      '\n' +
      'Canaux d\'accompagnements\n' +
      'À domicile;0\n' +
      'À distance;0\n' +
      'Lieu d\'activité;23\n' +
      'Autre lieu;0\n' +
      '\n' +
      'Durée des accompagnements\n' +
      'Moins de 30 minutes;4\n' +
      '30-60 minutes;16\n' +
      '60-120 minutes;3\n' +
      'Plus de 120 minutes;0\n' +
      '\n' +
      'Tranches d’âge des usagers (en %)\n' +
      'Moins de 12 ans;0\n' +
      '12-18 ans;4\n' +
      '18-35 ans;86\n' +
      '35-60 ans;4\n' +
      'Plus de 60 ans;4\n' +
      '\n' +
      'Statut des usagers (en %)\n' +
      'Scolarisé(e);4\n' +
      'Sans emploi;91\n' +
      'En emploi;0\n' +
      'Retraité;4\n' +
      'Non renseigné;0\n' +
      '\n' +
      'Évolution des comptes rendus d\'activité\n' +
      '2021\n' +
      'Juillet;485\n' +
      'Août;1476\n' +
      'Septembre;4022\n' +
      'Octobre;8438\n' +
      'Novembre;430\n' +
      '\n' +
      'Usager.ères réorienté.es (en %)\n' +
      'CEFS;2\n' +
      'Assistante sociale;9\n' +
      'Sous-préfecture;2\n' +
      'Pôle emploi;6\n' +
      'Port maritime;11\n' +
      'Lieu vide;70';


    const fileContent = buildExportStatistiquesCsvFileContent(statistiques, dateDebut, dateFin, cnfsFullName, idType, codePostal, isAdminCoop);

    expect(fileContent).toEqual(expectedFileContent);
  });
});
