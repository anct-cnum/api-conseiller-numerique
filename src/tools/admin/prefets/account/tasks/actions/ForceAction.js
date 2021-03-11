class ForceAction {

  getQuery() {
    return { 'roles': { $elemMatch: { '$eq': 'prefet' } } };
  }
}

module.exports = ForceAction;
