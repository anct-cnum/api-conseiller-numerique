const { DBRef, ObjectId } = require('mongodb');

const assignPermanence = (body, database) => {
  let permanence = Object.assign({}, body);
  permanence.conseiller = new DBRef('conseiller', new ObjectId(body.conseillerId), database);
  permanence.structure = new DBRef('structure', new ObjectId(body.structureId), database);
  permanence.updatedAt = new Date();
  delete permanence._id;
  delete permanence.conseillerId;
  delete permanence.structureId;
  permanence.horaires.forEach(horaires => {
    delete horaires.fermeture;
  });
  return permanence;
};

const updatePermanenceToSchema = (body, database) => (
  assignPermanence(body, database)
);

module.exports = {
  assignPermanence,
  updatePermanenceToSchema
};
