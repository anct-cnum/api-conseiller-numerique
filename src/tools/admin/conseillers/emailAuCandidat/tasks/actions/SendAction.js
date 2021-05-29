class SendAction {

  getQuery(limit) {
    return [
      { '$match': { 'conseillerObj.disponible': true, 'statut': { $ne: 'RECRUTE' } } },
      { $group: { _id: '$conseillerObj._id', email: { $first: '$conseillerObj.email' } } },
      { $limit: limit }
    ];
  }
}

module.exports = SendAction;
