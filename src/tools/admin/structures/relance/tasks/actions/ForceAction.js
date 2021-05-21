class ForceAction {

  getQuery() {
    return { 'roles': { $elemMatch: { '$eq': 'structure' } } };
  }
}

module.exports = ForceAction;
