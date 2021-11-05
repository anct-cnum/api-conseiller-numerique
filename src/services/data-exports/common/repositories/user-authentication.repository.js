const { ObjectID } = require('mongodb');
const userAuthenticationRepository = db => async userId => await db.collection('users').findOne({ _id: new ObjectID(userId) });

module.exports = {
  userAuthenticationRepository
};
