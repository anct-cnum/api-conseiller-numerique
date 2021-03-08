class SendAction {

  getQuery() {
    return {
      'roles': { $elemMatch: { '$eq': 'structure' } },
      'mailSentDate': null,
    };
  }
}

module.exports = SendAction;
