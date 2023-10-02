const MongoClient = require('mongodb').MongoClient;
const util = require('util');

let explaining = false;

const isLogAggregateMode = process.env.NODE_ENV === 'aggregate';

const connectionOptions = {
  useUnifiedTopology: true,
  monitorCommands: isLogAggregateMode,
};

async function logExplain(client, event, requestId) {
  try {
    explaining = true;

    const { command, databaseName } = event;
    const collectionName = command.aggregate;
    const pipeline = command.pipeline;

    const db = client.db(databaseName);
    const collection = db.collection(collectionName);
    const cursor = collection.aggregate(pipeline, { explain: true });
    const explainOutput = await cursor.next();

    console.log(`Résultat commande Explain pour requestId ${requestId} :`, util.inspect(explainOutput, { depth: null }));
  } catch (err) {
    console.error('Erreur pendant la requête explain :', err);
  } finally {
    explaining = false;
  }
}

module.exports = function(app) {
  const connection = app.get('mongodb');
  const database = connection.substr(connection.lastIndexOf('/') + 1);
  const mongoClient = MongoClient.connect(connection, connectionOptions)
  .then(client => {
    const commandTimings = new Map();

    client.on('commandStarted', event => {
      if (event.commandName === 'aggregate' && !explaining) {
        commandTimings.set(event.requestId, Date.now());
        console.log(`Commande Aggregate started: ${util.inspect(event, { depth: null })}`);
        logExplain(client, event, event.requestId);
      }
    });

    client.on('commandSucceeded', event => {
      if (commandTimings.has(event.requestId)) {
        const startTime = commandTimings.get(event.requestId);
        const elapsedTime = Date.now() - startTime;
        commandTimings.delete(event.requestId);

        console.log(`Commande Aggregate finie : ${util.inspect(event, { depth: null })}, Time elapsed: ${elapsedTime} ms`);
      }
    });

    return client.db(database);
  });

  app.set('mongoClient', mongoClient);
};
