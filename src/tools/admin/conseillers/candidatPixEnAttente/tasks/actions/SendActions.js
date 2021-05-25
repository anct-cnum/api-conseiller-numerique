class SendAction {

  getQuery() {
    return { 'roles': { $elemMatch: { '$eq': 'prefet' } } };
  }
}

module.exports = SendAction;
