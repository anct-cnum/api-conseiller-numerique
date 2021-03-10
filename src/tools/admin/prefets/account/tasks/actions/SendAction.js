class SendAction {

  getQuery() {
    return {
      'roles': { $elemMatch: { '$eq': 'prefet' } },
      'mailSentDate': null,
    };
  }
}

module.exports = SendAction;
