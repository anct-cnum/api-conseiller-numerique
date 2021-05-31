class SendAction {

  getQuery(limit) {
    return [
      { '$match': { 'sondageSentAt': null, 'conseillerObj.disponible': true, 'statut': { $ne: 'recrutee' } } },
      { $group: { _id: '$conseillerObj._id', email: { $first: '$conseillerObj.email' } } },
      { $limit: limit }
    ];
  }
}

module.exports = SendAction;
