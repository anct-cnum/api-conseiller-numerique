class ForceAction {

  getQuery() {
    return { 'roles': { $elemMatch: { '$eq': 'conseiller' } } };
  }
}

module.exports = ForceAction;
