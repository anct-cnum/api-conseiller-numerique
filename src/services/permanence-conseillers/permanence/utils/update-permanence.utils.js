const { DBRef, ObjectId } = require('mongodb');

const assignPermanence = (body, conseillerId, database) => {
  let permanence = Object.assign({}, body);

  permanence.conseillers = [];
  body.conseillers.forEach(conseiller => {
    permanence.conseillers.push(new ObjectId(conseiller));
  });
  permanence.conseillersItinerants = [];
  body?.conseillersItinerants?.forEach(conseiller => {
    permanence.conseillersItinerants.push(new ObjectId(conseiller));
  });
  permanence.lieuPrincipalPour = [];
  body?.lieuPrincipalPour?.forEach(conseiller => {
    permanence.lieuPrincipalPour.push(new ObjectId(conseiller));
  });

  permanence.structure = new DBRef('structure', new ObjectId(body.structureId), database);
  permanence.updatedAt = new Date();
  permanence.updatedBy = new ObjectId(conseillerId);

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

const assignPermanences = (permanences, conseillerId) => {

  permanences.forEach(permanence => {
    const conseillers = [];
    const conseillersItinerants = [];
    const lieuPrincipalPour = [];

    permanence._id = permanence._id ? new ObjectId(permanence._id) : null;

    permanence?.conseillers.forEach(conseiller => {
      conseillers.push(new ObjectId(conseiller));
    });
    permanence.conseillers = conseillers;

    permanence?.conseillersItinerants.forEach(conseillerItinerant => {
      conseillersItinerants.push(new ObjectId(conseillerItinerant));
    });
    permanence.conseillersItinerants = conseillersItinerants;

    permanence?.lieuPrincipalPour.forEach(conseiller => {
      lieuPrincipalPour.push(new ObjectId(conseiller));
    });
    permanence.lieuPrincipalPour = lieuPrincipalPour;

    permanence.structure.$id = new ObjectId(permanence.structure.$id);

    permanence.updatedAt = new Date();
    permanence.updatedBy = new ObjectId(conseillerId);

    permanence?.horaires?.forEach(horaires => {
      delete horaires.fermeture;
    });
  });

  return permanences;
};
const updatePermanenceToSchema = (body, conseillerId, database) => assignPermanence(body, conseillerId, database);

const updatePermanencesToSchema = async (body, conseillerId) => await assignPermanences(body, conseillerId);

module.exports = {
  assignPermanence,
  updatePermanenceToSchema,
  updatePermanencesToSchema
};
