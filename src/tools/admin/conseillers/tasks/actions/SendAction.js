class SendAction {

  getQuery() {
    return {
      'statut': { $elemMatch: { '$neq': 'recrutee' } }
    };
  }
}

module.exports = SendAction;
