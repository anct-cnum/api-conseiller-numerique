const { Service } = require('feathers-mongodb');
const { NotFound } = require('@feathersjs/errors');

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
        res.status(404).send(new NotFound('Structure not found', {
          token
        }).toJSON());
        return;
      }
      res.send(users.data[0]);
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
        res.status(404).send(new NotFound('Structure not found', {
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
