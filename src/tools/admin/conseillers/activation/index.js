const Pulsar = require('pulsar-client');

(async () => {
  const client = new Pulsar.Client({
    serviceUrl: 'pulsar+ssl://c1-pulsar-clevercloud-customers.services.clever-cloud.com:2002',
  });

  const producer = await client.createProducer({
    topic: 'creation-compte-coop',
  });

  await producer.send({
    data: Buffer.from({ id: 0, username: 'toto', password: 'titi' }),
  });

  await producer.close();

  await client.close();
})();
