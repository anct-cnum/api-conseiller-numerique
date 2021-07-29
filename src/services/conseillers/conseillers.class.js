const { Service } = require('feathers-mongodb');
const { NotFound, Conflict, BadFormat, NotAuthenticated, Forbidden } = require('@feathersjs/errors');
const { ObjectId } = require('mongodb');
const logger = require('../../logger');
const decode = require('jwt-decode');
const puppeteer = require('puppeteer');

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
        res.status(409).send(new BadFormat('Erreur : veuillez remplir tous les champs obligatoires (*) du formulaire.').toJSON());
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
        logger.error(error);
        res.status(409).send(new Conflict('La mise à jour a échoué, veuillez réessayer.').toJSON());
      }

      res.send({ isUpdated: true });
    });

    app.post('/conseillers/statistiquesPDF/:dateDebut/:dateFin', async (req, res) => {
      app.get('mongoClient').then(async db => {

        const accessToken = req.feathers?.authentication?.accessToken;

        if (req.feathers?.authentication === undefined) {
          res.status(401).send(new NotAuthenticated('User not authenticated'));
        }
        let userId = decode(accessToken).sub;
        const user = await db.collection('users').findOne({ _id: new ObjectId(userId) });
        if (!user?.roles.includes('conseiller')) {
          res.status(403).send(new Forbidden('User not authorized', {
            userId: userId
          }).toJSON());
          return;
        }

        const dateDebut = req.params.dateDebut;
        const dateFin = req.params.dateFin;

        /** Ouverture d'un navigateur en headless afin de générer le PDF **/
        try {

          const browser = await puppeteer.launch();

          browser.on('targetchanged', async target => {
            const targetPage = await target.page();
            const client = await targetPage.target().createCDPSession();
            await client.send('Runtime.evaluate', {
              expression: `localStorage.setItem('user', '{"accessToken":"${accessToken}",` +
              `"authentication":{` +
                `"strategy":"local",` +
                `"accessToken":"${accessToken}"},` +
              `"user":{` +
                `"_id":"${user._id}",` +
                `"name":"${user.name}",` +
                `"entity":{"$ref":"${user.entity.namespace}",` +
                `"$id":"${user.entity.oid}",` +
                `"$db":"${user.entity.db}"},` +
                `"token":${user.token},` +
                `"mailSentDate":${user.mailSentDate},` +
                `"passwordCreated":${user.passwordCreated},` +
                `"createdAt":"${user.createdAt}",` +
                `"tokenCreatedAt":${user.tokenCreatedAt},` +
                `"pdfGenerator": true,` +
                `"role":"${user.roles[0]}"}}')`
            });
          });


          const page = await browser.newPage();

          // Pour utilisation en local => 'http://localhost:3000/statistiques'
          await Promise.all([
            page.goto(/*app.get('espace_coop_hostname')+*/ 'http://localhost:3000/statistiques', { waitUntil: 'networkidle0' }),
          ]);

          await page.focus('#datePickerDebutPDF');
          await page.keyboard.type(dateDebut.toString());

          await page.focus('#datePickerFinPDF');
          await page.keyboard.type(dateFin.toString());

          await page.click('#chargePDF');
          await page.waitForTimeout(500);

          let pdf;
          await Promise.all([
            page.addStyleTag({ content: '#burgerMenu { display: none} .no-print { display: none } #formPDF { display: none}' }),
            pdf = page.pdf({ format: 'A4', printBackground: true })
          ]);

          await browser.close();

          res.contentType('application/pdf');
          pdf.then(buffer => res.send(buffer));

        } catch (error) {
          app.get('sentry').captureException(error);
          logger.error(error);
          res.status(409).send(new Conflict('Une erreur est survenue lors de la création du PDF, veuillez réessayer.').toJSON());
        }
      });
    });
  }
};
