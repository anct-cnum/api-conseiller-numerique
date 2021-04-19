class ForceAction {

  getQuery() {
    return { 'roles': { $elemMatch: { '$eq': 'admin' } } };
  }
}

module.exports = ForceAction;
