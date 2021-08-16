class ForceAction {

  getQuery() {
    return { 'roles': { $elemMatch: { '$eq': 'candidat' } } };
  }
}

module.exports = ForceAction;
