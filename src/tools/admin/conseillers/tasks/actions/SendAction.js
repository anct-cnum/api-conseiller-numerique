class SendAction {

  getQuery() {
    return {
      'statut': { $elemMatch: { '$eq': 'nouvelle' } },
    };
  }
}

module.exports = SendAction;
