const Joi = require('joi');

const checkAuth = req => {
  return !req.feathers?.authentication === undefined;
};

const checkRole = (roles, authorized) => {
  return roles.includes(authorized);
};

const checkSchema = req => {
  const schema = Joi.object({
    page: Joi.number().required().error(new Error('Le numéro de page est invalide')),
    territoire: Joi.string().required().error(new Error('Le type de territoire est invalide')),
    dateDebut: Joi.date().required().error(new Error('La date de début est invalide')),
    dateFin: Joi.date().required().error(new Error('La date de fin est invalide')),
    nomOrdre: Joi.string().required().error(new Error('Le nom de l\'ordre est invalide')),
    ordre: Joi.number().required().error(new Error('L\'ordre est invalide')),
  }).validate(req.query);

  return schema;
};

const getTerritoires = db => async (type, date, ordre, page, limit) => {
  if (type === 'codeDepartement') {
    return await db.collection('stats_Territoires').find({ 'date': date })
    .sort(ordre)
    .skip(page)
    .limit(limit).toArray();
  } else if (type === 'codeRegion') {
    return await db.collection('stats_Territoires').aggregate(
      { $match: { date: date } },
      { $group: {
        _id: {
          codeRegion: '$codeRegion',
          nomRegion: '$nomRegion',
        },
        nombreConseillersCoselec: { $sum: '$nombreConseillersCoselec' },
        cnfsActives: { $sum: '$cnfsActives' },
        cnfsInactives: { $sum: '$cnfsInactives' },
        conseillerIds: { $push: '$conseillerIds' }
      } },
      { $addFields: { 'codeRegion': '$_id.codeRegion', 'nomRegion': '$_id.nomRegion' } },
      { $project: {
        _id: 0, codeRegion: 1, nomRegion: 1, nombreConseillersCoselec: 1, cnfsActives: 1, cnfsInactives: 1,
        conseillerIds: { $reduce: {
          input: '$conseillerIds',
          initialValue: [],
          in: { $concatArrays: ['$$value', '$$this'] }
        } }
      } },
      { $sort: ordre },
      { $skip: page },
      { $limit: limit },
    ).toArray();
  }
};

const getTotalTerritoires = db => async (date, type) => {
  if (type === 'codeDepartement') {
    return await db.collection('stats_Territoires').countDocuments({ 'date': date });
  } else if (type === 'codeRegion') {
    const statsTotal = await db.collection('stats_Territoires').aggregate(
      { $match: { date: date } },
      { $group: { _id: { codeRegion: '$codeRegion' } } },
      { $project: { _id: 0 } }
    ).toArray();
    return statsTotal.length;
  }
};

module.exports = {
  checkAuth,
  checkRole,
  checkSchema,
  getTerritoires,
  getTotalTerritoires
};
