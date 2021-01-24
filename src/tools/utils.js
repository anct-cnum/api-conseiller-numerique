const moment = require('moment');

module.exports = {
  execute: async job => {

    process.on('unhandledRejection', e => console.log(e));
    process.on('uncaughtException', e => console.log(e));

    const exit = async error => {
      if (error) {
        console.error(error);
        process.exitCode = 1;
      }
      process.exit();
    };

    let jobComponents = Object.assign({}, { exit });

    try {
      let launchTime = new Date().getTime();
      await job(jobComponents);
      let duration = moment.utc(new Date().getTime() - launchTime).format('HH:mm:ss.SSS');
      console.log(`Completed in ${duration}`);
      exit();
    } catch (e) {
      exit(e);
    }
  },
};
