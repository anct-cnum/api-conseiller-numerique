class SendAction {

  getQuery() {
    return {
      'statut': { $ne: 'RECRUTE' }
    };
  }
}

module.exports = SendAction;
