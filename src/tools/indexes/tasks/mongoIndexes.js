module.exports = {
  users: async db => {
    return Promise.all([
      db.collection('users').createIndex({ 'name': 1 }, { unique: true }),
      db.collection('users').createIndex({ 'roles': 1 }),
      db.collection('users').createIndex({ 'token': 1 }),
      db.collection('users').createIndex({ 'tokenCreatedAt': 1 }),
      db.collection('users').createIndex({ 'mailSentDate': 1 }),
      db.collection('users').createIndex({ 'entity.$id': 1 }),
    ]);
  },
  structures: async db => {
    return Promise.all([
      db.collection('structures').createIndex({ 'idPG': 1 }),
      db.collection('structures').createIndex({ 'nom': 1 }),
      db.collection('structures').createIndex({ 'createdAt': -1 }),
      db.collection('structures').createIndex({ 'type': 1 }),
      db.collection('structures').createIndex({ 'statut': 1 }),
      db.collection('structures').createIndex({ 'codeDepartement': 1 }),
      db.collection('structures').createIndex({ 'codePostal': 1 }),
      db.collection('structures').createIndex({ 'codeRegion': 1 }),
      db.collection('structures').createIndex({ 'userCreated': 1 }),
      db.collection('structures').createIndex({ 'reseau': 1 }),
      db.collection('structures').createIndex({ 'urlPriseRdv': 1 }),
      db.collection('structures').createIndex({ 'conventionnement.statut': 1 }),
      db.collection('structures').createIndex({ 'coselecAt': 1 }),
      db.collection('structures').createIndex({ 'historique.date': 1 }),
    ]);
  },
  misesEnRelation: async db => {
    return Promise.all([
      db.collection('misesEnRelation').createIndex({ 'statut': 1 }),
      db.collection('misesEnRelation').createIndex({ 'structure.$id': 1 }),
      db.collection('misesEnRelation').createIndex({ 'conseiller.$id': 1 }),
      db.collection('misesEnRelation').createIndex({ 'structureObj.codePostal': 1 }),
      db.collection('misesEnRelation').createIndex({ 'structureObj.idPG': 1 }),
      db.collection('misesEnRelation').createIndex({ 'conseillerObj.idPG': 1 }),
      db.collection('misesEnRelation').createIndex({ 'conseillerObj.email': 1 }),
      db.collection('misesEnRelation').createIndex({ 'emetteurRenouvellement.date': 1 }),
      db.collection('misesEnRelation').createIndex({ 'emetteurRupture.date': 1 }),
      db.collection('misesEnRelation').createIndex({ 'emetteurRecrutement.date': 1 }),
      db.collection('misesEnRelation').createIndex({ 'banniereRefusRecrutement': 1 }),
    ]);
  },
  conseillers: async db => {
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
      db.collection('conseillers').createIndex({ 'cv.date': 1 }),
      db.collection('conseillers').createIndex({ 'statut': 1 }),
      db.collection('conseillers').createIndex({ 'userCreated': 1 }),
      db.collection('conseillers').createIndex({ 'email': 1 }),
      db.collection('conseillers').createIndex({ 'dateFinFormation': 1 }),
      db.collection('conseillers').createIndex({ 'structureId': 1 }),
      db.collection('conseillers').createIndex({ 'emailCN.address': 1 }),
      db.collection('conseillers').createIndex({ 'codeRegionStructure': 1 }),
      db.collection('conseillers').createIndex({ 'codeDepartementStructure': 1 }),
      db.collection('conseillers').createIndex({ 'estCoordinateur': 1 }),
      db.collection('conseillers').createIndex({ 'listeSubordonnes.type': 1 }),
      db.collection('conseillers').createIndex({ 'listeSubordonnes.liste': 1 }),
      db.collection('conseillers').createIndex({ 'inactivite': 1 }),
      db.collection('conseillers').createIndex({ 'nonAffichageCarto': 1 }),
      db.collection('conseillers').createIndex({ 'coordinateurs': 1 }),
    ]);
  },
  cras: async db => {
    return Promise.all([
      db.collection('cras').createIndex({ 'conseiller.$id': 1 }),
      db.collection('cras').createIndex({ 'permanence.$id': 1 }),
      db.collection('cras').createIndex({ 'structure.$id': 1 }),
      db.collection('cras').createIndex({ 'createdAt': 1 }),
      db.collection('cras').createIndex({ 'cra.duree': 1 }),
      db.collection('cras').createIndex({ 'cra.codePostal': 1 }),
      db.collection('cras').createIndex({ 'cra.sousThemes': 1 }),
      db.collection('cras').createIndex({ 'cra.dateAccompagnement': 1 }),
      db.collection('cras').createIndex({ 'cra.codeCommune': 1 }),
      db.collection('cras').createIndex({ 'cra.organismes': 1 }),
    ]);
  },
  stats_conseillers_cras: async db => {
    return Promise.all([
      db.collection('stats_conseillers_cras').createIndex({ 'conseiller.$id': 1 }),
    ]);
  },
  stats_Territoires: async db => {
    return Promise.all([
      db.collection('stats_Territoires').createIndex({ 'date': 1 }),
    ]);
  },
  permanences: async db => {
    return Promise.all([
      db.collection('permanences').createIndex({ 'conseillers': 1 }),
      db.collection('permanences').createIndex({ 'conseillersItinerants': 1 }),
      db.collection('permanences').createIndex({ 'lieuPrincipalPour': 1 }),
      db.collection('permanences').createIndex({ 'structure.$id': 1 }),
      db.collection('permanences').createIndex({ 'conseillersItinerants': 1 }),
      db.collection('permanences').createIndex({ 'adresse.codeCommune': 1 }),
    ]);
  },
  accessLogs: async db => {
    return Promise.all([
      db.collection('accessLogs').createIndex({ 'createdAt': 1 }),
      db.collection('accessLogs').createIndex({ 'name': 1 }),
    ]);
  },
  qpv: async db => {
    return Promise.all([
      db.collection('qpv').createIndex({ 'geometry': '2dsphere' }),
    ]);
  },
  conseillersSupprimes: async db => {
    return Promise.all([
      db.collection('conseillersSupprimes').createIndex({ 'conseiller.idPG': 1 }),
    ]);
  },
};
