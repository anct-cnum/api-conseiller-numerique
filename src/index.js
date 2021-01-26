const server = require('./server');
const createComponents = require('./components');

const main = async () => {

    const components = await createComponents();
    const app = server(components);
    const logger = components.logger;

    process.on('unhandledRejection', e => logger.error(e));
    process.on('uncaughtException', e => logger.error(e));

    const httpServer = app.listen(components.configuration.app.port, () => {
          const address = httpServer.address();
          logger.info(`Listening to http://${address.address}:${address.port}`);
        });
};

main();
