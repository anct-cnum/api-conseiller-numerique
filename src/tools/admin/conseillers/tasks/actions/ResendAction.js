const moment = require('moment');

class ResendAction {

  constructor(app) {
    this.configuration = app.get('smtp');
  }

  getQuery() {
    //let delay = this.configuration.structure.accountsRelaunchDelay;

    return {
      'statut': { $elemMatch: { '$eq': 'nouvelle' } },
      /*'$and': [
        { mailSentDate: { $ne: null } },
        { mailSentDate: { $lte: moment().subtract(delay, 'days').toDate() } },
      ],
      'resend': { $ne: true },*/
    };
  }
}

module.exports = ResendAction;
