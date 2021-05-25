const moment = require('moment');

class ResendAction {

  constructor(app) {
    this.configuration = app.get('smtp');
  }

  getQuery() {
    let delay = this.configuration.conseiller.accountsRelaunchDelay;

    return {
      'roles': { $elemMatch: { '$eq': 'conseiller' } },
      '$and': [
        { mailSentDate: { $ne: null } },
        { mailSentDate: { $lte: moment().subtract(delay, 'days').toDate() } },
      ],
      'resend': { $ne: true },
    };
  }
}

module.exports = ResendAction;
