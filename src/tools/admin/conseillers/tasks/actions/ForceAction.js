class ForceAction {

  getQuery() {
    return [
      { '$match': { 'conseillerObj.disponible': true, 'statut': { $ne: 'RECRUTE' } } },
      { $group: { _id: '$conseillerObj._id', email: { $first: '$conseillerObj.email' } } }
    ];
  }
}

module.exports = ForceAction;
