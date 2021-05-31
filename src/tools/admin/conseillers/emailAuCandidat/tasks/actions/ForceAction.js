class ForceAction {

  getQuery(limit) {
    return [
      { '$match': { 'emailConfirmationKey': { $not: /^.-./ }, 'conseillerObj.disponible': true, 'statut': { $ne: 'recrutee' } } },
      { $group: { _id: '$conseillerObj._id', email: { $first: '$conseillerObj.email' } } },
      { $limit: limit }
    ];
  }
}

module.exports = ForceAction;
