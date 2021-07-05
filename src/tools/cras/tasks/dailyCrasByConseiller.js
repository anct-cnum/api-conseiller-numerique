const { DBRef, ObjectId } = require('mongodb');
const configuration = require('@feathersjs/configuration');
const feathers = require('@feathersjs/feathers');
const app = feathers().configure(configuration());
const connection = app.get('mongodb');
const database = connection.substr(connection.lastIndexOf('/') + 1);

const insertDailyCrasStatsByConseiller = async (db, query, logger, dateDebut, monthCalcul) => {

  let detailsCras = await db.collection('cras').aggregate(
    [
      { $match: { ...query } },
      {
        $addFields: {
          'conseiller': {
            $arrayElemAt: [{ $objectToArray: '$conseiller' }, 1] //Obligé de passer par objectToArray car dbref non supporté avec le aggregate
          }
        }
      },
      {
        $addFields: {
          'conseiller': '$conseiller.v'
        }
      },
      { $group: { _id: '$conseiller', count: { $sum: 1 } } },
      { $group: { _id: null, listConseiller: { $push: {
        'idConseiller': '$_id',
        'totalCras': '$count',
      } } } },
    ]
  ).toArray();

  let year = dateDebut.getUTCFullYear();
  let month = dateDebut.getMonth();
  let promises = [];

  detailsCras[0]?.listConseiller.forEach(conseiller => {
    promises.push(new Promise(async resolve => {
      //Recupere la nouvelle stat de cette date d'hier
      let newStat = conseiller.totalCras;
      //Regarde l'ancienne stat correpondante si présente (correpondante au mois et à l'annee)
      // eslint-disable-next-line max-len
      const queryUpd = { conseiller: new DBRef('conseillers', new ObjectId(conseiller.idConseiller), database) };
      const remove = { $pull: { [year]: { 'mois': month } } };
      const options = { upsert: true };

      let conseillerStats = await db.collection('stats_conseillers_cras').findOne({ 'conseiller.$id': new ObjectId(conseiller.idConseiller) });
      if (conseillerStats) {
        let oldStat = conseillerStats[year]?.find(stat => stat.mois === month)?.totalCras;
        //Si trouvé alors on additionne la nouvelle stat (seulement si on est pas dans le recalcul total d'un mois)
        newStat = oldStat && !monthCalcul ? oldStat + conseiller.totalCras : conseiller.totalCras;
        //On peut supprimer l'ancienne valeur (correpondante au mois et à l'annee)
        await db.collection('stats_conseillers_cras').updateOne(queryUpd, remove, options);
      }

      //Ajout ou mise à jour de la nouvelle stat correspondante au mois et à l'annee
      const update = { $push: { [year]: { 'mois': month, 'totalCras': newStat } } };
      await db.collection('stats_conseillers_cras').updateOne(queryUpd, update, options);
      logger.info(`Statistiques CRAs du conseiller (id=${conseiller.idConseiller} totalCras=${conseiller.totalCras}) mis à jour`);
      resolve();
    }));
  });
  await Promise.all(promises);


};

module.exports = { insertDailyCrasStatsByConseiller };
