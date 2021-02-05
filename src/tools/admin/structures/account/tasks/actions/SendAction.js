class SendAction {

  getQuery() {
    return {
      'roles': { $elemMatch: { '$eq': 'structure' } },
      'passwordHash': null,
      'mailSentDate': null,
    };
  }
}

module.exports = SendAction;
