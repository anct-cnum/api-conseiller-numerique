const { ValidationError } = require('joi');
const {
  validateExportStatistiquesSchema,
  exportStatistiquesQueryToSchema,
  buildExportStatistiquesCsvFileContent,
  getExportStatistiquesFileName
} = require('./export-statistiques.utils');

describe('utilitaire pour l\'export des statistiques', () => {
  describe('validation du schéma de données', () => {
    it('devrait être en erreur lorsque la donnée d\'entrée est vide', () => {
      const schemaValidation = validateExportStatistiquesSchema({});

      expect(schemaValidation).toEqual({
        error: new Error('La date de début est invalide'),
        value: {},
      });
    });

    it('devrait être en erreur lorsque la donnée d\'entrée contient un champ non admis', () => {
      const schemaValidation = validateExportStatistiquesSchema({
        dateDebut: new Date(2021, 11, 1),
        dateFin: new Date(2021, 12, 31),
        type: 'user',
        idType: '4a9bc1489ac8ba4c891b9a1c',
        test: 'error'
      });

      expect(schemaValidation).toEqual({
        error: new ValidationError('"test" is not allowed'),
        value: {
          dateDebut: new Date(2021, 11, 1),
          dateFin: new Date(2021, 12, 31),
          type: 'user',
          idType: '4a9bc1489ac8ba4c891b9a1c',
          test: 'error'
        }
      });
    });

    it('devrait être en succès lorsque la donnée d\'entrée est valide', () => {
      const schemaValidation = validateExportStatistiquesSchema({
        dateDebut: new Date(2021, 11, 1),
        dateFin: new Date(2021, 12, 31),
        type: 'user',
        idType: '4a9bc1489ac8ba4c891b9a1c',
      });

      expect(schemaValidation).toEqual({
        value: {
          dateDebut: new Date(2021, 11, 1),
          dateFin: new Date(2021, 12, 31),
          type: 'user',
          idType: '4a9bc1489ac8ba4c891b9a1c',
        },
      });
    });
  });

  describe('projection du modèle de requête vers le modèle de schema', () => {
    it('devrait transformer les données de la requête dans le format attendu quand le idType est défini', () => {
      const query = {
        dateDebut: 'Fri Jan 01 2021 00:00:00 GMT 0100 (Central European Standard Time)',
        dateFin: 'Thu Nov 18 2021 11:00:00 GMT 0100 (Central European Standard Time)',
        type: 'user',
        idType: '4a9bc1489ac8ba4c891b9a1c'
      };

      const schemaModel = exportStatistiquesQueryToSchema(query);

      expect(schemaModel).toStrictEqual({
        dateDebut: new Date('2021-01-01T00:00:00.000Z'),
        dateFin: new Date('2021-11-18T11:00:00.000Z'),
        type: 'user',
        idType: '4a9bc1489ac8ba4c891b9a1c'
      });
    });
  });

  describe('nom du fichier CSV d\'export des statistiques', () => {
    it('devrait contenir le nom complet du CNFS et les dates correspondant aux filtres', () => {
      const conseiller = {
        prenom: 'John',
        nom: 'Doe',
      };
      const dateDebut = new Date('2021-01-01T00:00:00.000Z');
      const dateFin = new Date('2021-11-18T00:00:00.000Z');

      const fileName = getExportStatistiquesFileName(conseiller, dateDebut, dateFin);

      expect(fileName).toBe('Statistiques_John_Doe_01-01-2021_18-11-2021');
    });
  });

  describe('construction du contenu du fichier CSV d\'export des statistiques', () => {
    it('devrait retourner le contenu à partir des données statistiques', () => {
      const cnfsFullName = 'John Doe';
      const dateDebut = new Date('2021-01-01T00:00:00.000Z');
      const dateFin = new Date('2021-11-15T00:00:00.000Z');
      const statistiques = {
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

      const expectedFileContent =
        'Statistiques John Doe 01/01/2021-15/11/2021\n' +
        '\n' +
        'Général\n' +
        'Personnes accompagnées durant cette période;23\n' +
        'Ateliers réalisés;0\n' +
        'Total des participants aux ateliers;0\n' +
        'Accompagnements individuels;10\n' +
        'Demandes ponctuelles;13\n' +
        'Usagers qui ont bénéficiés d\'un accompagnement poursuivi;21\n' +
        'Pourcentage du total des usagers accompagnés sur cette période;91\n' +
        'Accompagnements individuels;11\n' +
        'Accompagnements en atelier collectif;0\n' +
        'Redirections vers une autre structure agréée;10\n' +
        '\n' +
        'Thèmes des accompagnements\n' +
        'Équipement informatique;13\n' +
        'Naviguer sur internet;9\n' +
        'Courriels;8\n' +
        'Applications smartphone;2\n' +
        'Gestion de contenus numériques;8\n' +
        'Env., vocab. Numérique;4\n' +
        'Traitement de texte;8\n' +
        'Échanger avec ses proches;0\n' +
        'Emploi, formation;21\n' +
        'Accompagner son enfant;0\n' +
        'Numérique et TPE/PME;0\n' +
        'Démarche en ligne;21\n' +
        'Autre;13\n' +
        '\n' +
        'Lieux des accompagnements\n' +
        'À domicile;0\n' +
        'À distance;0\n' +
        'Lieu de rattachement;23\n' +
        'Autre;0\n' +
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
        'Étudiant;4\n' +
        'Sans emploi;91\n' +
        'En emploi;0\n' +
        'Retraité;4\n' +
        'Non renseigné;0\n' +
        '\n' +
        'Évolution des accompagnements\n' +
        '2021\n' +
        'Juillet;485\n' +
        'Août;1476\n' +
        'Septembre;4022\n' +
        'Octobre;8438\n' +
        'Novembre;430\n';
      const fileContent = buildExportStatistiquesCsvFileContent(statistiques, cnfsFullName, dateDebut, dateFin);

      expect(fileContent).toEqual(expectedFileContent);
    });
  });
});
