const { DBRef, ObjectId } = require('mongodb');

const assignPermanence = (body, database) => {
  let permanence = Object.assign({}, body);

  permanence.conseillers = [];
  body.conseillers.forEach(conseiller => {
    permanence.conseillers.push(new ObjectId(conseiller));
  });
  permanence.conseillersItinerants = [];
  body?.conseillersItinerants?.forEach(conseiller => {
    permanence.conseillersItinerants.push(new ObjectId(conseiller));
  });

  permanence.structure = new DBRef('structure', new ObjectId(body.structureId), database);
  permanence.updatedAt = new Date();
  permanence.updatedBy = new ObjectId(body.conseillerId);

  delete permanence._id;
  delete permanence.structureId;
  delete permanence.telephonePro;
  delete permanence.emailPro;
  delete permanence.estCoordinateur;
  delete permanence.showPermanenceForm;
  delete permanence.hasPermanence;

  permanence?.horaires?.forEach(horaires => {
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
