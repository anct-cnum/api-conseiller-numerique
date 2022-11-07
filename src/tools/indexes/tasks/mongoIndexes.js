module.exports = {
  users: db => {
    return Promise.all([
      db.collection('users').createIndex({ 'name': 1 }, { unique: true }),
      db.collection('users').createIndex({ 'roles': 1 }),
      db.collection('users').createIndex({ 'token': 1 }),
      db.collection('users').createIndex({ 'tokenCreatedAt': 1 }),
      db.collection('users').createIndex({ 'mailSentDate': 1 }),
      db.collection('users').createIndex({ 'passwordCreated': 1 }),
    ]);
  },
  structures: db => {
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
      db.collection('structures').createIndex({ 'prefet.avisPrefet': 1 }),
      db.collection('structures').createIndex({ 'coselec.avisCoselec': 1 }),
      db.collection('structures').createIndex({ 'reseau': 1 }),
      db.collection('structures').createIndex({ 'urlPriseRdv': 1 }),
      db.collection('structures').createIndex({
        'siret': 'text',
        'nom': 'text',
        'contact.email': 'text',
      }, { name: 'bo-search-fulltext' }),
    ]);
  },
  misesEnRelation: db => {
    return Promise.all([
      db.collection('misesEnRelation').createIndex({ 'statut': 1 }),
      db.collection('misesEnRelation').createIndex({ 'structure.$id': 1 }),
      db.collection('misesEnRelation').createIndex({ 'structure.oid': 1 }),
      db.collection('misesEnRelation').createIndex({ 'conseiller.$id': 1 }),
      db.collection('misesEnRelation').createIndex({ 'structureObj.codePostal': 1 }),
      db.collection('misesEnRelation').createIndex({ 'structureObj.idPG': 1 }),
      db.collection('misesEnRelation').createIndex({ 'conseillerObj.idPG': 1 }),
      db.collection('misesEnRelation').createIndex({ 'conseillerObj.disponible': 1 }),
      db.collection('misesEnRelation').createIndex({ 'conseillerObj.email': 1 }),
      db.collection('misesEnRelation').createIndex({ 'conseillerObj.cv': 1 }),
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
      db.collection('conseillers').createIndex({ 'cv.date': 1 }),
      db.collection('conseillers').createIndex({ 'statut': 1 }),
      db.collection('conseillers').createIndex({ 'userCreated': 1 }),
      db.collection('conseillers').createIndex({ 'userCreationError': 1 }),
      db.collection('conseillers').createIndex({ 'email': 1 }),
      db.collection('conseillers').createIndex({ 'estRecrute': 1 }),
      db.collection('conseillers').createIndex({ 'dateFinFormation': 1 }),
      db.collection('conseillers').createIndex({ 'structureId': 1 }),
      db.collection('conseillers').createIndex({ 'emailCN.address': 1 }),
      db.collection('conseillers').createIndex({ 'codeRegionStructure': 1 }),
      db.collection('conseillers').createIndex({ 'codeDepartementStructure': 1 }),
      db.collection('conseillers').createIndex({ 'estCoordinateur': 1 }),
      db.collection('conseillers').createIndex({ 'listeSubordonnes.type': 1 }),
      db.collection('conseillers').createIndex({ 'listeSubordonnes.liste': 1 })
    ]);
  },
  cras: db => {
    return Promise.all([
      db.collection('cras').createIndex({ 'conseiller.$id': 1 }),
      db.collection('cras').createIndex({ 'createdAt': 1 }),
      db.collection('cras').createIndex({ 'cra.duree': 1 }),
      db.collection('cras').createIndex({ 'cra.codePostal': 1 }),
      db.collection('cras').createIndex({ 'cra.themes': 1 }),
      db.collection('cras').createIndex({ 'cra.dateAccompagnement': 1 }),
    ]);
  },
  stats_conseillers_cras: db => {
    return Promise.all([
      db.collection('stats_conseillers_cras').createIndex({ 'conseiller.$id': 1 }),
    ]);
  },
  stats_Territoires: db => {
    return Promise.all([
      db.collection('stats_Territoires').createIndex({ 'date': 1 }),
    ]);
  },
  ressources: db => {
    return Promise.all([
      db.collection('ressources').createIndex({
        'categorie': 'text',
        'description': 'text',
        'lien': 'text',
        'tags': 'text',
      }, { name: 'bo-search-fulltext' }),
    ]);
  },
  ressourcesTags: db => {
    return Promise.all([
      db.collection('ressourcesTags').createIndex({ 'nom': 1 }, { unique: true })
    ]);
  },
  hubs: db => {
    return Promise.all([
      db.collection('hubs').createIndex({ 'region_name': 1 }),
    ]);
  },
  permanences: db => {
    return Promise.all([
      db.collection('permanences').createIndex({ 'conseillers': 1 }),
      db.collection('permanences').createIndex({ 'conseillersItinerants': 1 }),
      db.collection('permanences').createIndex({ 'lieuPrincipalPour': 1 }),
      db.collection('permanences').createIndex({ 'structure.$id': 1 })
    ]);
  },
};
