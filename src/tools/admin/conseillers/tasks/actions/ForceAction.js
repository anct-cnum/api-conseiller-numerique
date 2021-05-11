class ForceAction {

  getQuery() {
    return { 'statut': { $elemMatch: { '$neq': 'recrutee' } } };
  }
}

module.exports = ForceAction;
