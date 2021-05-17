class SendAction {

  getQuery() {
    return {
      'statut': { $elemMatch: { '$neq': 'RECRUTE' } }
    };
  }
}

module.exports = SendAction;
