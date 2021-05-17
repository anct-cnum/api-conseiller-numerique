class ForceAction {

  getQuery() {
    return { 'statut': { $elemMatch: { '$neq': 'RECRUTE' } } };
  }
}

module.exports = ForceAction;
