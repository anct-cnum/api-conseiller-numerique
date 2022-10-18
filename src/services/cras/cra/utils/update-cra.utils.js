const { ObjectId } = require('mongodb');

const assignCra = body => {
  let objectCra = Object.assign({}, body);
  
  //Ajout de l'id
  objectCra._id = new ObjectId(objectCra.cra.id);
  //Separation CP / ville
  objectCra.cra.codePostal = objectCra.cra.cp.slice(0, 5);
  objectCra.cra.nomCommune = objectCra.cra.cp.slice(6);
  //Mise en forme de la date d'accompagnement
  objectCra.cra.dateAccompagnement = new Date(objectCra.cra.dateAccompagnement);
  //Ajout de la date de mise à jour
  objectCra.updatedAt = new Date();
  //Suppression des champs en trop
  delete objectCra.cra.updatedAt;
  delete objectCra.cra.datePickerStatus;
  delete objectCra.cra.cp;
  delete objectCra.cra.id;
  delete objectCra.cra.loading;
  delete objectCra.cra.oldDateAccompagnement;
  delete objectCra.conseillerId;

  return objectCra;
};

const updateCraToSchema = body => assignCra(body);

module.exports = {
  assignCra,
  updateCraToSchema,
};
