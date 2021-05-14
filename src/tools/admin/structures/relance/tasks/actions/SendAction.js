class SendAction {

  getQuery() {
    return {
      'roles': { $elemMatch: { '$eq': 'structure' } },
      'mailSentDate': { $ne: null },
      'passwordCreated': { $ne: true }
    };
  }
}

module.exports = SendAction;
