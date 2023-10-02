const { DBRef, ObjectId } = require('mongodb');
const configuration = require('@feathersjs/configuration');
const feathers = require('@feathersjs/feathers');
const app = feathers().configure(configuration());
const connection = app.get('mongodb');
const database = connection.substr(connection.lastIndexOf('/') + 1);

const getStatsConseillerCras = db => async idConseiller => {
  return await db.collection('stats_conseillers_cras').findOne({ 'conseiller.$id': idConseiller });
};

const insertDailyCrasStatsByConseiller = async (db, query, logger) => {

  let detailsCras = await db.collection('cras').find(query).toArray();
  const listMois = Array.from({ length: 12 }, (e, i) => {
    return new Date(null, i + 1, null).toLocaleDateString('fr', { month: 'long' });
  });
  let promises = [];
  let list = [];

  logger.info('Nombre de CRAs récupérés à traiter pour ce mois : ' + detailsCras.length);

  detailsCras.forEach(detailsCra => {
    let year = detailsCra.cra.dateAccompagnement.getUTCFullYear();
    let month = detailsCra.cra.dateAccompagnement.getMonth();
    let newSumCra = 1;

    list?.forEach((statsConseiller, id) => {
      if (String(statsConseiller.conseillerId) === String(detailsCra.conseiller.oid) && statsConseiller.mois === month && statsConseiller.annee === year) {
        newSumCra = statsConseiller.sumCras + 1;
        delete list[id];
      }
    });

    list.push({ 'conseillerId': detailsCra.conseiller.oid, 'mois': month, 'annee': year, 'sumCras': newSumCra });
  });

  list?.forEach(statsToUpdate => {
    promises.push(new Promise(async resolve => {
      const statsConseillerCras = await getStatsConseillerCras(db)(statsToUpdate.conseillerId);

      const queryUpd = { conseiller: new DBRef('conseillers', new ObjectId(statsToUpdate.conseillerId), database) };
      const remove = { $pull: { [String(statsToUpdate.annee)]: { 'mois': statsToUpdate.mois } } };
      const options = { upsert: true };

      let totalCras = statsToUpdate.sumCras;

      if (statsConseillerCras) {
        const oldtotalCras = statsConseillerCras[String(statsToUpdate.annee)]?.find(stat => stat.mois === statsToUpdate.mois)?.totalCras;
        totalCras += oldtotalCras ?? 0;
      }

      //On peut supprimer l'ancienne valeur (correpondante au mois et à l'annee)
      await db.collection('stats_conseillers_cras').updateOne(queryUpd, remove, options);

      //Ajout ou mise à jour de la nouvelle stat correspondante au mois et à l'annee
      // eslint-disable-next-line max-len
      const update = { $push: { [String(statsToUpdate.annee)]: { 'mois': statsToUpdate.mois, 'totalCras': totalCras, 'indication': listMois[statsToUpdate.mois] } } };
      const result = await db.collection('stats_conseillers_cras').updateOne(queryUpd, update, options);

      logger.info(`Statistiques CRAs du conseiller (id=${statsToUpdate.conseillerId} totalCras=${totalCras}) mis à jour`);

      resolve(result);
    }));
  });

  await Promise.all(promises);

};

module.exports = { insertDailyCrasStatsByConseiller };
