class ForceAction {

  getQuery() {
    return { 'statut': { $elemMatch: { '$eq': 'nouvelle' } } };
  }
}

module.exports = ForceAction;
