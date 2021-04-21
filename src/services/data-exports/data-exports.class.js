/* eslint-disable no-unused-vars */

const { ObjectID } = require('mongodb');
const moment = require('moment');

exports.DataExports = class DataExports {
  constructor (options, app) {
    this.options = options || {};

    let db;

    app.get('mongoClient').then(mongoDB => {
      db = mongoDB;
    });

    app.get('/exports/candidats.csv', async (req, res) => {
      const miseEnrelations = await db.collection('misesEnRelation').find({ statut: 'recrutee' }).sort({ 'miseEnrelation.structure.oid': 1 }).toArray();
      let promises = [];

      // eslint-disable-next-line max-len
      res.write('Date candidature;Date recrutement;prenom;nom;expérience;téléphone;email;Code Postal;Nom commune;Département;diplômé;palier pix;SIRET structure;ID Structure;Dénomination;Type;Code postal;Code commune;Code département;Code région;Téléphone;Email;ID conseiller;Nom du comité de sélection;Nombre de conseillers attribués en comité de sélection\n');

      miseEnrelations.forEach(miseEnrelation => {
        promises.push(new Promise(async resolve => {
          let conseiller = await db.collection('conseillers').findOne({ _id: new ObjectID(miseEnrelation.conseiller.oid) });
          let structure = await db.collection('structures').findOne({ _id: new ObjectID(miseEnrelation.structure.oid) });
          let coselec = [...structure.coselec].pop();
          // eslint-disable-next-line max-len
          res.write(`${moment(conseiller.createdAt).format('DD/MM/yyyy')};${miseEnrelation.dateRecrutement === null ? 'non renseignée' : moment(miseEnrelation.dateRecrutement).format('DD/MM/yyyy')};${conseiller.prenom};${conseiller.nom};${conseiller.aUneExperienceMedNum ? 'oui' : 'non'};${conseiller.telephone};${conseiller.email};${conseiller.codePostal};${conseiller.nomCommune};${conseiller.codeDepartement};${conseiller.estDiplomeMedNum ? 'oui' : 'non'};${conseiller.pix ? conseiller.pix.palier : ''};${structure.siret};${structure.idPG};${structure.nom};${structure.type};${structure.codePostal};${structure.codeCommune};${structure.codeDepartement};${structure.codeRegion};${structure.contactTelephone};${structure.contactEmail};${conseiller._id};${coselec.numero};${coselec.nombreConseillersCoselec};\n`);
          resolve();
        }));
      });

      await Promise.all(promises);
      res.send();
    });
  }

  async find (params) {
    return [];
  }

  async get (id, params) {
    return {
      id, text: `A new message with ID: ${id}!`
    };
  }

  async create (data, params) {
    if (Array.isArray(data)) {
      return Promise.all(data.map(current => this.create(current, params)));
    }

    return data;
  }

  async update (id, data, params) {
    return data;
  }

  async patch (id, data, params) {
    return data;
  }

  async remove (id, params) {
    return { id };
  }
};
