const { DBRef, ObjectId } = require('mongodb');

const getPermanenceByConseiller = db => async conseillerId => {
  return await db.collection('permanences').findOne({ 'conseiller.$id': new ObjectId(conseillerId) });
};

const createPermanence = db => async (permanence, database) => {
  await db.collection('permanences').insertOne(
    {
      conseiller: new DBRef('conseiller', new ObjectId(permanence.conseillerId), database),
      structure: new DBRef('structure', new ObjectId(permanence.structureId), database),
      nomEnseigne: permanence.nomEnseigne,
      numeroTelephone: permanence.numeroTelephone,
      email: permanence.email,
      siteWeb: permanence.siteWeb,
      siret: permanence.siret,
      adresse: permanence.adresse,
      horaires: permanence.horaires,
      itinerant: permanence.itinerant,
      updatedAt: permanence.updatedAt
    }
  );
  await db.collection('conseillers').updateOne({
    _id: new ObjectId(permanence.conseillerId)
  }, {
    $set: { hasPermanence: true }
  });
};

const setPermanence = db => async (permanenceId, permanence) => {
  await db.collection('permanences').updateOne({
    _id: new ObjectId(permanenceId)
  }, {
    $set: {
      nomEnseigne: permanence.nomEnseigne,
      numeroTelephone: permanence.numeroTelephone,
      email: permanence.email,
      siteWeb: permanence.siteWeb,
      siret: permanence.siret,
      adresse: permanence.adresse,
      horaires: permanence.horaires,
      itinerant: permanence.itinerant,
      updatedAt: permanence.updatedAt
    }
  });
};
module.exports = {
  setPermanence,
  getPermanenceByConseiller,
  createPermanence
};
