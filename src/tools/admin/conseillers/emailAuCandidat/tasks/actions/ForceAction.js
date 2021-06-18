class ForceAction {

  getQuery() {
    return [
      { '$match': { 'conseillerObj.disponible': true, 'statut': { $ne: 'recrutee' } } },
      { $group: { _id: '$conseillerObj._id', email: { $first: '$conseillerObj.email' } } }
    ];
  }
}

module.exports = ForceAction;
