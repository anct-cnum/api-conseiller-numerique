class ForceAction {

  getQuery() {
    return { 'statut': { $ne: 'RECRUTE' } };
  }
}

module.exports = ForceAction;
