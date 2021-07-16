const { Service } = require('feathers-mongodb');
const { NotFound, Conflict } = require('@feathersjs/errors');
const { ObjectId } = require('mongodb');

exports.Conseillers = class Conseillers extends Service {
  constructor(options, app) {
    super(options);

    app.get('mongoClient').then(db => {
      this.Model = db.collection('conseillers');
    });

    app.get('/conseillers/verifyCandidateToken/:token', async (req, res) => {
      const token = req.params.token;
      const conseillers = await this.find({
        query: {
          emailConfirmationKey: token,
          $limit: 1,
        }
      });

      if (conseillers.total === 0) {
        res.status(404).send(new NotFound('Conseiller not found', {
          token
        }).toJSON());
        return;
      }

      res.send({ isValid: true, conseiller: conseillers.data[0] });
    });

    app.get('/conseillers/verifySondageToken/:token', async (req, res) => {
      const token = req.params.token;
      const conseillers = await this.find({
        query: {
          sondageToken: token,
          $limit: 1,
        }
      });

      if (conseillers.total === 0) {
        res.status(404).send(new NotFound('Désolé mais le lien est invalide.', {
          token
        }).toJSON());
        return;
      }

      const sondage = new Promise(async resolve => {
        const p = new Promise(async resolve => {
          app.get('mongoClient').then(db => {
            let sondage = db.collection('sondages').countDocuments(
              {
                'conseiller.$id': conseillers.data[0]._id
              });
            resolve(sondage);
          });
        });
        resolve(p);
      });
      const result = await sondage;
      if (result > 0) {
        res.status(409).send(new NotFound('Sondage déjà répondu.', {
          token
        }).toJSON());
        return;
      }

      res.send({ isValid: true, conseiller: conseillers.data[0] });
    });

    app.post('/conseillers/createSexeAge', async (req, res) => {
      const user = req.body.user;

      if (user.sexe === '' || user.dateDeNaissance === '') {
        res.status(409).send(new Conflict('Erreur : veuillez remplir tous les champs obligatoires (*) du formulaire.').toJSON());
        return;
      }

      let conseiller = await this.find({
        query: {
          _id: new ObjectId(user.idCandidat),
          $limit: 1,
        }
      });

      if (conseiller.total === 0) {
        res.status(409).send(new Conflict('Ce compte candidat n\'existe pas ! Vous allez être déconnecté.').toJSON());
        return;
      }

      try {
        await this.patch(new ObjectId(user.idCandidat),
          { $set: {
            sexe: user.sexe,
            dateDeNaissance: user.dateDeNaissance
          } });
      } catch (error) {
        app.get('sentry').captureException(error);
        res.status(409).send(new Conflict('La mise à jour a échoué, veuillez réessayer.').toJSON());
      }

      res.send({ isUpdated: true });
    });
  }
};
