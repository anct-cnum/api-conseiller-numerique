const { Sexe, createSexeAgeBodyToSchema, validateCreateSexeAgeSchema, conseillerGuard } = require('./create-sexe-age.util');
const { canActivate } = require('../../../../common/utils/feathers.utils');
const { NotFound } = require('@feathersjs/errors');

describe('utilitaires pour l\'ajout des propriétés sexe et age des conseillers', () => {
  describe('projection du modèle de requête vers le modèle de schema', () => {
    it('devrait transformer les données du body de la requête dans le format attendu', () => {
      const body = {
        sexe: Sexe.Femme,
        dateDeNaissance: '1992-12-08T23:00:00.000Z',
      };

      const schemaModel = createSexeAgeBodyToSchema(body);

      expect(schemaModel).toStrictEqual({
        sexe: Sexe.Femme,
        dateDeNaissance: new Date('1992-12-08T23:00:00.000Z'),
      });
    });
  });

  describe('validation du schéma de données', () => {
    it('devrait être en erreur lorsque la donnée d\'entrée est vide', () => {
      const schemaValidation = validateCreateSexeAgeSchema({});

      expect(schemaValidation).toEqual({
        error: new Error('Le champ sexe est obligatoire'),
        value: {},
      });
    });

    it('devrait être en erreur lorsque sexe n\'est pas une valeur attendue', () => {
      const schemaValidation = validateCreateSexeAgeSchema({
        sexe: '',
        dateDeNaissance: new Date('1992-12-08T23:00:00.000Z')
      });

      expect(schemaValidation).toEqual({
        error: new Error('Le champ sexe est obligatoire'),
        value: {
          sexe: '',
          dateDeNaissance: new Date('1992-12-08T23:00:00.000Z')
        },
      });
    });

    it('devrait être en erreur lorsque date de naissance n\'est pas une valeur attendue', () => {
      const erroredDate = new Date('');
      const schemaValidation = validateCreateSexeAgeSchema({
        sexe: Sexe.Femme,
        dateDeNaissance: erroredDate
      });

      expect(schemaValidation).toStrictEqual({
        error: new Error('Le champ date de naissance est obligatoire'),
        value: {
          sexe: Sexe.Femme,
          dateDeNaissance: erroredDate
        },
      });
    });

    it('devrait être en erreur lorsque la donnée d\'entrée contient un champ non admis', () => {
      const schemaValidation = validateCreateSexeAgeSchema({
        sexe: Sexe.Homme,
        dateDeNaissance: new Date('1992-12-08T23:00:00.000Z'),
        test: true
      });

      expect(schemaValidation).toEqual({
        error: new Error('"test" is not allowed'),
        value: {
          sexe: Sexe.Homme,
          dateDeNaissance: new Date('1992-12-08T23:00:00.000Z'),
          test: true
        },
      });
    });

    it('devrait être en succès lorsque la donnée d\'entrée est valide', () => {
      const schemaValidation = validateCreateSexeAgeSchema({
        sexe: Sexe.Autre,
        dateDeNaissance: new Date('1992-12-08T23:00:00.000Z'),
      });

      expect(schemaValidation).toEqual({
        value: {
          sexe: Sexe.Autre,
          dateDeNaissance: new Date('1992-12-08T23:00:00.000Z'),
        },
      });
    });
  });

  describe('conseiller guard', () => {
    it('devrait retourner une erreur si le compte conseillé associé à un utilisateur n\'existe pas', async () => {
      const conseillerId = '69da91f98da981ad981ad891';

      const countConseillersDoubles = () => 0;

      await expect((async () => {
        await canActivate(
          conseillerGuard(conseillerId, countConseillersDoubles)
        );
      })()).rejects.toThrowError(new NotFound('Ce compte n\'existe pas ! Vous allez être déconnecté.'));
    });

    it('ne devrait pas retourner une erreur si le compte conseillé associé à un utilisateur existe', async () => {
      const conseillerId = '69da91f98da981ad981ad891';

      const countConseillersDoubles = () => 1;

      await expect((async () => {
        await canActivate(
          conseillerGuard(conseillerId, countConseillersDoubles)
        );
      })()).resolves.toBeUndefined();
    });
  });
});
