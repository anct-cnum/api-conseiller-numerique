class SendAction {

  getQuery() {
    return {
      'roles': { $elemMatch: { '$eq': 'admin' } },
      'mailSentDate': null,
    };
  }
}

module.exports = SendAction;
