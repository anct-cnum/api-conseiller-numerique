const getNombreCra = db => async query => {
  return await db.collection('cras').countDocuments(query);
};

module.exports = { getNombreCra };
