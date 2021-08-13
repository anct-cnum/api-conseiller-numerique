class SendAction {

  getQuery() {
    return {
      'roles': { $elemMatch: { '$eq': 'candidat' } },
      'mailSentDate': null,
    };
  }
}

module.exports = SendAction;
