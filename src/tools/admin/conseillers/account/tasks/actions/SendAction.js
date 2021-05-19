class SendAction {

  getQuery() {
    return {
      'roles': { $elemMatch: { '$eq': 'conseiller' } },
      'mailSentDate': null,
    };
  }
}

module.exports = SendAction;
