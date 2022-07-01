const { authenticate } = require('@feathersjs/authentication').hooks;
const search = require('feathers-mongodb-fuzzy-search');
const { Forbidden, BadRequest } = require('@feathersjs/errors');
const checkPermissions = require('feathers-permissions');
const { ObjectID } = require('mongodb');
const Joi = require('joi');

module.exports = {
  before: {
    all: [
      authenticate('jwt'),
      checkPermissions({
        roles: ['admin', 'structure', 'prefet', 'conseiller', 'admin_coop', 'structure_coop', 'coordinateur_coop', 'candidat'],
        field: 'roles',
      })
    ],
    find: [
      checkPermissions({
        roles: ['admin', 'structure', 'admin_coop', 'prefet', 'structure_coop', 'coordinateur_coop'],
        field: 'roles',
      }),
      context => {
        if (context.params?.user?.roles.includes('prefet')) {
          const departement = context.params?.user.departement;
          const region = context.params?.user.region;

          context.params.query = {
            ...context.params.query,
            ...(departement ? { codeDepartement: departement.toString() } : {}),
            ...(region ? { codeRegion: region.toString() } : {})
          };
        }
        if (context.params.query.$skip) {
          const paginate = context.app.get('paginate');
          const page = context.params.query.$skip;
          context.params.query.$skip = page > 0 ? ((page - 1) * paginate.default) : 0;
        }
        if (context.params.query.datePrisePoste?.$gt) {
          context.params.query.datePrisePoste.$gt = parseStringToDate(context.params.query.datePrisePoste.$gt);
        }
        if (context.params.query.datePrisePoste?.$lt) {
          context.params.query.datePrisePoste.$lt = parseStringToDate(context.params.query.datePrisePoste.$lt);
        }
        if (context.params.query.userCreated) {
          context.params.query.userCreated = context.params.query.userCreated === 'true';
        }
        if (context.params.query.certifie) {
          context.params.query.certifie = context.params.query.certifie === 'false' ? null : true;
        }
        if (context.params.query.groupeCRA) {
          context.params.query.groupeCRA = parseInt(context.params.query.groupeCRA);
        }

        if (context.params.query.isUserActif === 'true') {
          context.params.query.emailCNError = { $ne: null };
          context.params.query.mattermost = { $ne: null };
          delete context.params.query.isUserActif;
        } else if (context.params.query.isUserActif === 'false') {
          context.params.query.emailCNError = null;
          context.params.query.mattermost = null;
          delete context.params.query.isUserActif;
        }

        if (context.params.query.structureId) {
          context.params.query.structureId = new ObjectID(context.params.query.structureId);
        }
        if (context.params.query.codeRegionBystructure) {
          // partie de query utilisé pour le after (codeRegion pour la structure associée)
          context.params.query.codeRegionBystructure = context.params.query.codeRegionBystructure.toString();
        }

        if (context.params.query.$search) {
          context.params.query.$search = '"' + context.params.query.$search + '"';
        }
        return context;
      }, search({ escape: false })
    ],
    get: [
      async context => {
        //Restreindre les permissions : les conseillers (non coordinateur) et candidats ne peuvent voir que les informations les concernant
        if ((context.params?.user?.roles.includes('conseiller') && !context.params?.user?.roles.includes('coordinateur_coop')) ||
          context.params?.user?.roles.includes('candidat')) {
          if (context.id.toString() !== context.params?.user?.entity?.oid.toString()) {
            throw new Forbidden('Vous n\'avez pas l\'autorisation');
          }
        }
      }
    ],
    create: [
      checkPermissions({
        roles: ['admin'],
        field: 'roles',
      })
    ],
    update: [
      checkPermissions({
        roles: ['admin', 'conseiller', 'admin_coop', 'structure_coop', 'coordinateur_coop', 'candidat'],
        field: 'roles',
      }),
      async context => {
        //Restreindre les permissions : les conseillers et candidats ne peuvent mettre à jour que les informations les concernant
        if (context.params?.user?.roles.includes('conseiller') || context.params?.user?.roles.includes('candidat')) {
          if (context.id.toString() !== context.params?.user?.entity?.oid.toString()) {
            throw new Forbidden('Vous n\'avez pas l\'autorisation');
          }
        }
      }
    ],
    patch: [
      checkPermissions({
        roles: ['admin', 'conseiller', 'admin_coop', 'structure_coop', 'coordinateur_coop', 'candidat'],
        field: 'roles',
      }),
      async context => {
        //Restreindre les permissions : les conseillers et candidats ne peuvent mettre à jour que les informations les concernant
        if (context.params?.user?.roles.includes('conseiller') || context.params?.user?.roles.includes('candidat')) {
          if (context.id.toString() !== context.params?.user?.entity?.oid.toString()) {
            throw new Forbidden('Vous n\'avez pas l\'autorisation');
          }
        }

        const schema = Joi.object({

          nom: Joi.string().trim().min(2).max(50).required().error(new Error('Le champ nom est obligatoire')),
          prenom: Joi.string().trim().min(2).max(50).required().error(new Error('Le champ prénom est obligatoire')),
          fonction: Joi.string().trim().min(2).max(100).required().error(new Error('Le champ fonction est obligatoire')),
          // eslint-disable-next-line max-len
          email: Joi.string().required().regex(/^(([^<>()[\]\\.,;:\s@\\"]+(\.[^<>()[\]\\.,;:\s@\\"]+)*)|(\\".+\\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/).error(new Error('L\'adresse email est invalide')),
          // eslint-disable-next-line max-len
          numeroTelephone: Joi.string().required().regex(/^(?:(?:\+)(33|590|596|594|262|269))(?:[\s.-]*\d{3}){3,4}$/).error(new Error('Le numéro de téléphone est invalide')),
        }).validate(context.data.supHierarchique);

        if (schema.error) {
          throw new BadRequest(schema.error);
        } else {
          return context;
        }
      }
    ],
    remove: [
      checkPermissions({
        roles: ['admin'],
        field: 'roles',
      })
    ]
  },

  after: {
    all: [],
    find: [async context => {
      if (context.params?.user?.roles.includes('structure')) {
        const p = new Promise(resolve => {
          context.app.get('mongoClient').then(async db => {
            let promises = [];
            let result = [];
            context.result.data.filter(async conseiller => {
              const p = new Promise(async resolve => {
                let miseEnRelationCount = await db.collection('misesEnRelation').countDocuments(
                  {
                    'structure.$id': context.params?.user.entity.oid,
                    'conseiller.$id': conseiller._id
                  });
                if (miseEnRelationCount === 0 || context.params.query.statut === 'RECRUTE') {
                  const dejaFinalisee = await db.collection('misesEnRelation').countDocuments(
                    {
                      'statut': 'finalisee',
                      'conseiller.$id': conseiller._id
                    });

                  if (dejaFinalisee === 1) {
                    conseiller.finalisee = true;
                    conseiller.craCount = await db.collection('cras').countDocuments({
                      'conseiller.$id': conseiller._id
                    });
                  }
                  result.push(conseiller);
                }
                context.result.data = result;
                resolve();
              });
              promises.push(p);
            });
            await Promise.all(promises);
            resolve();
          });
        });
        await p;
      }

      if (context.params?.user?.roles.includes('admin_coop')) {

        const p = new Promise(resolve => {
          context.app.get('mongoClient').then(async db => {
            let promises = [];
            let result = [];
            context.result.data.filter(async conseiller => {
              const p = new Promise(async resolve => {
                const structure = await db.collection('structures').findOne({ '_id': conseiller.structureId });
                const nombreCra = await db.collection('cras').countDocuments({
                  'conseiller.$id': conseiller._id
                });
                if (structure) {
                  conseiller.nomStructure = structure?.nom;
                  conseiller.craCount = nombreCra;
                }
                result.push(conseiller);
                resolve();
              });
              promises.push(p);
            });
            await Promise.all(promises);
            context.result.data = result;
            resolve();
          });
        });
        return await p;
      }
    }],
    get: [async context => {
      if (context.params?.user?.roles.includes('structure') || context.params?.user?.roles.includes('prefet') ||
        context.params?.user?.roles.includes('admin')) {
        const p = new Promise(resolve => {
          const result = context.app.get('mongoClient').then(async db => {

            if (context.params?.user?.roles.includes('structure')) {
              const miseEnRelationRecrutee = await db.collection('misesEnRelation').findOne(
                {
                  '$or': [{ 'statut': { $eq: 'recrutee' } }, { 'statut': { $eq: 'finalisee' } }],
                  'conseiller.$id': context.result._id,
                  'dateRecrutement': { $ne: null },
                  'structure.$id': context.params?.user?.entity?.oid
                }
              );

              context.result.dateRecrutement = [miseEnRelationRecrutee?.dateRecrutement];
            } else {
              const miseEnRelationRecrutees = await db.collection('misesEnRelation').find(
                {
                  '$or': [{ 'statut': { $eq: 'recrutee' } }, { 'statut': { $eq: 'finalisee' } }],
                  'dateRecrutement': { $ne: null },
                  'conseiller.$id': context.result._id
                }
              ).toArray();

              let dateRecrutement = [];
              let nomStructures = [];
              miseEnRelationRecrutees.forEach(miseEnRelationRecrutee => {
                dateRecrutement.push(miseEnRelationRecrutee?.dateRecrutement);
                nomStructures.push(miseEnRelationRecrutee?.structureObj?.nom);
              });
              context.result.dateRecrutement = dateRecrutement;
              context.result.nomStructures = nomStructures;
            }
            const possedeCompteCandidat = await db.collection('users').countDocuments(
              {
                'entity.$id': context.result._id,
                'roles': { $in: ['candidat'] }
              }
            );
            context.result.possedeCompteCandidat = possedeCompteCandidat > 0;
            return context;
          });
          resolve(result);
        });
        return await p;
      }
    }],
    create: [],
    update: [],
    patch: [],
    remove: []
  },

  error: {
    all: [],
    find: [],
    get: [],
    create: [],
    update: [],
    patch: [],
    remove: []
  }
};

//Parse string to date
function parseStringToDate(date) {
  if (typeof date === 'string') {
    date = new Date(date);
  }
  return date;
}
