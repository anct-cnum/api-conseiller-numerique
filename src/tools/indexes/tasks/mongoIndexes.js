module.exports = {
  users: db => {
    return Promise.all([
      db.collection('users').createIndex({ 'name': 1 }, { unique: true })
    ]);
  },
  structures: db => {
    return Promise.all([
      db.collection('structures').createIndex({ 'idPG': 1 }),
      db.collection('structures').createIndex({ 'createdAt': -1 }),
      db.collection('structures').createIndex({ 'type': 1 }),
      db.collection('structures').createIndex({ 'statut': 1 }),
      db.collection('structures').createIndex({ 'avisPrefet': 1 }),
      db.collection('structures').createIndex({ 'codeDepartement': 1 }),
      db.collection('structures').createIndex({ 'codeRegion': 1 }),
      db.collection('structures').createIndex({ 'userCreated': 1 }),
      db.collection('structures').createIndex({
        'siret': 'text',
        'nom': 'text',
        'contactEmail': 'text',
      }, { name: 'bo-search-fulltext' }),
    ]);
  },
  misesEnRelation: db => {
    return Promise.all([
      db.collection('misesEnRelation').createIndex({ 'statut': 1 }),
      db.collection('misesEnRelation').createIndex({
        'conseillerObj.nom': 'text',
        'conseillerObj.prenom': 'text',
        'conseillerObj.email': 'text',
      }, { name: 'bo-search-fulltext' }),
    ]);
  },
  conseillers: db => {
    return Promise.all([
      db.collection('conseillers').createIndex({ 'idPG': 1 }),
      db.collection('conseillers').createIndex({ 'codeDepartement': 1 }),
      db.collection('conseillers').createIndex({ 'codeRegion': 1 }),
      db.collection('conseillers').createIndex({ 'location': '2dsphere' }),
      db.collection('conseillers').createIndex({
        'nom': 'text',
        'prenom': 'text',
        'email': 'text',
      }, { name: 'bo-search-fulltext' }),
    ]);
  },
};
