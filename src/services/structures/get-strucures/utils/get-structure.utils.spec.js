const { isStructureDuplicate } = require('./get-structure.utils');

describe('la vérification si la structure est un doublon', () => {
  it('ne devrait pas être considéré comme un doublon s\'il n\'y a pas d\'avis préfet DOUBLON et que le statut n\'est pas DOUBLON', () => {
    const structure = {
      statut: 'VALIDATION_COSELEC',
      prefet: [
        {
          avisPrefet: 'NÉGATIF',
          commentairePrefet: 'Ne respecte pas les conditions du dispositif',
          nombreConseillersPrefet: 0,
          fichier: 'Reprise fichiers prefets/coselec 7/conseiller-numerique-12-Aveyron-vague-1-version-1-retour-1-valide-1.xlsx',
          ligne: 14,
          insertedAt: new Date('2021-09-20T08:20:46.854Z')

        }
      ]
    };

    expect(isStructureDuplicate(structure)).toBe(false);
  });

  it('devrait être considéré comme un doublon s\'il n\'y a pas d\'avis préfet DOUBLON et que le statut est DOUBLON', () => {
    const structure = {
      statut: 'DOUBLON',
      prefet: [
        {
          avisPrefet: 'NÉGATIF',
          commentairePrefet: 'Ne respecte pas les conditions du dispositif',
          nombreConseillersPrefet: 0,
          fichier: 'Reprise fichiers prefets/coselec 7/conseiller-numerique-12-Aveyron-vague-1-version-1-retour-1-valide-1.xlsx',
          ligne: 14,
          insertedAt: new Date('2021-09-20T08:20:46.854Z')

        }
      ]
    };

    expect(isStructureDuplicate(structure)).toBe(true);
  });

  it('devrait être considéré comme un doublon s\'il y a un avis préfet DOUBLON', () => {
    const structure = {
      statut: 'VALIDATION_COSELEC',
      prefet: [
        {
          avisPrefet: 'DOUBLON',
          commentairePrefet: 'Est un doublon',
          nombreConseillersPrefet: 0,
          fichier: 'Reprise fichiers prefets/coselec 7/conseiller-numerique-12-Aveyron-vague-1-version-1-retour-1-valide-1.xlsx',
          ligne: 14,
          insertedAt: new Date('2021-09-20T08:20:46.854Z')
        }
      ]
    };

    expect(isStructureDuplicate(structure)).toBe(true);
  });

  it('devrait être considéré comme un doublon si le dernier avis préfet est DOUBLON', () => {
    const structure = {
      statut: 'VALIDATION_COSELEC',
      prefet: [
        {
          avisPrefet: 'NÉGATIF',
          commentairePrefet: 'Ne respecte pas les conditions du dispositif',
          nombreConseillersPrefet: 0,
          fichier: 'Reprise fichiers prefets/coselec 7/conseiller-numerique-12-Aveyron-vague-1-version-1-retour-1-valide-1.xlsx',
          ligne: 14,
          insertedAt: new Date('2021-09-20T08:20:46.854Z')
        },
        {
          avisPrefet: 'DOUBLON',
          commentairePrefet: 'Est un doublon',
          nombreConseillersPrefet: 0,
          fichier: 'Reprise fichiers prefets/coselec 8/conseiller-numerique-12-Aveyron-vague-1-version-1-retour-1-valide-1.xlsx',
          ligne: 14,
          insertedAt: new Date('2021-09-20T08:20:46.854Z')
        }
      ]
    };

    expect(isStructureDuplicate(structure)).toBe(true);
  });

  it('devrait être considéré comme un doublon si le dernier avis préfet est DOUBLON, mais que les avis ne sont pas dans l\'ordre', () => {
    const structure = {
      statut: 'VALIDATION_COSELEC',
      prefet: [
        {
          avisPrefet: 'DOUBLON',
          commentairePrefet: 'Est un doublon',
          nombreConseillersPrefet: 0,
          fichier: 'Reprise fichiers prefets/coselec 8/conseiller-numerique-12-Aveyron-vague-1-version-1-retour-1-valide-1.xlsx',
          ligne: 14,
          insertedAt: new Date('2021-09-20T08:20:46.854Z')
        },
        {
          avisPrefet: 'NÉGATIF',
          commentairePrefet: 'Ne respecte pas les conditions du dispositif',
          nombreConseillersPrefet: 0,
          fichier: 'Reprise fichiers prefets/coselec 7/conseiller-numerique-12-Aveyron-vague-1-version-1-retour-1-valide-1.xlsx',
          ligne: 14,
          insertedAt: new Date('2021-09-20T08:20:46.854Z')
        }
      ]
    };

    expect(isStructureDuplicate(structure)).toBe(true);
  });

  it('ne devrait pas être considéré comme un doublon si il n\'y a pas de donnée préfet', () => {
    const structure = {
      statut: 'VALIDATION_COSELEC'
    };

    expect(isStructureDuplicate(structure)).toBe(false);
  });

  it('ne devrait pas être considéré comme un doublon si la donnée préfet est vide', () => {
    const structure = {
      statut: 'VALIDATION_COSELEC',
      prefet: []
    };

    expect(isStructureDuplicate(structure)).toBe(false);
  });
});
