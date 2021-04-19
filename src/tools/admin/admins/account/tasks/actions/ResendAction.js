const moment = require('moment');

class ResendAction {

  constructor(app) {
    this.configuration = app.get('smtp');
  }

  getQuery() {
    let delay = this.configuration.admin.accountsRelaunchDelay;

    return {
      'roles': { $elemMatch: { '$eq': 'admin' } },
      '$and': [
        { mailSentDate: { $ne: null } },
        { mailSentDate: { $lte: moment().subtract(delay, 'days').toDate() } },
      ],
      'resend': { $ne: true },
    };
  }
}

module.exports = ResendAction;
