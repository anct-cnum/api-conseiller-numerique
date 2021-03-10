const { Service } = require('feathers-mongodb');
const { NotFound } = require('@feathersjs/errors');

const { v4: uuidv4 } = require('uuid');

exports.Users = class Users extends Service {
  constructor(options, app) {
    super(options);

    app.get('mongoClient').then(db => {
      this.Model = db.collection('users');
    });

    app.get('/users/verifyToken/:token', async (req, res) => {
      const token = req.params.token;
      const users = await this.find({
        query: {
          token: token,
          $limit: 1,
        }
      });
      if (users.total === 0) {
        res.status(404).send(new NotFound('User not found', {
          token
        }).toJSON());
        return;
      }
      res.send(users.data[0]);
    });

    app.post('/users/inviteAccountsPrefet', async (req, res) => {
      const token = req.body.token;
      const expectedToken = app.get('authentication').prefet.token;
      if (token !== expectedToken) {
        res.status(404).send(new NotFound('Token invalid', {
          token
        }).toJSON());
        return;
      }
      req.body.emails.forEach(async email => {
        let userInfo = {
          email: email,
          roles: ['prefet'],
          departement: req.body.departement,
          token: uuidv4(),
          passwordCreated: false,
          createdAt: new Date()
        };
        await app.service('users').create(userInfo);
      });
      res.send({ status: 'accounts created' });
    });

    app.get('/users/verifyPrefetToken/:token', async (req, res) => {
      const token = req.params.token;
      const expectedToken = app.get('authentication').prefet.token;
      res.send({ isValid: token === expectedToken });
    });

    app.post('/users/choosePassword/:token', async (req, res) => {
      const token = req.params.token;
      const password = req.body.password;
      const users = await this.find({
        query: {
          token: token,
          $limit: 1,
        }
      });
      if (users.total === 0) {
        res.status(404).send(new NotFound('User not found', {
          token
        }).toJSON());
        return;
      }
      const user = users.data[0];
      app.service('users').patch(user._id, { password: password, passwordCreated: true });
      res.send(user);
    });
  }
};
