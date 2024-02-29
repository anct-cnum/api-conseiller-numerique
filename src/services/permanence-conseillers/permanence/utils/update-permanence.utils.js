const { DBRef, ObjectId } = require('mongodb');
const Joi = require('joi');

const assignPermanence = (body, conseillerId, database) => {
  let permanence = Object.assign({}, body);
  permanence = JSON.parse(JSON.stringify(permanence).replace(/"\s+|\s+"/g, '"'));

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
  delete permanence.hasPermanence;
  delete permanence.idOldPermanence;

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

    permanence = JSON.parse(JSON.stringify(permanence).replace(/"\s+|\s+"/g, '"'));

    permanence._id = permanence._id ? new ObjectId(permanence._id) : null;
    permanence?.conseillers.forEach(conseiller => {
      conseillers.push(new ObjectId(conseiller));
    });
    permanence.conseillers = conseillers;

    permanence?.conseillersItinerants.forEach(conseillerItinerant => {
      conseillersItinerants.push(new ObjectId(conseillerItinerant));
    });
    permanence.conseillersItinerants = conseillersItinerants;

    permanence?.lieuPrincipalPour?.forEach(conseiller => {
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

const validationPermanences = permanences => {
  // eslint-disable-next-line max-len
  const regExpEmail = new RegExp(/^([a-zA-Z0-9]+(?:[\\._-][a-zA-Z0-9]+)*)@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/);
  const regExpNumero = new RegExp(/^(?:(?:\+)(33|590|596|594|262|269))(?:[\s.-]*\d{3}){3,4}$/);
  const regExpSiteWeb = new RegExp(/(https?):\/\/[a-z0-9\\/:%_+.,#?!@&=-]+/);
  const regExpSiret = new RegExp(/^$|^[0-9]{14}$/);

  const { error } = Joi.object({
    estStructure: Joi.boolean().allow(true, false).required().error(new Error('Un lieu d\'activité doit obligatoirement être saisi')),
    numeroTelephone: Joi.string().trim().allow('', null).pattern(regExpNumero).error(new Error('Un numéro de téléphone valide doit être saisi')),
    nomEnseigne: Joi.string().trim().required().error(new Error('Un lieu d\'activité doit obligatoirement être saisi')),
    adresse: {
      numeroRue: Joi.string().trim().required().allow('', null).error(new Error('Un numéro de voie doit obligatoirement être saisi')),
      rue: Joi.string().trim().required().min(5).max(120).error(new Error('Une rue doit obligatoirement être saisie')),
      codePostal: Joi.string().trim().required().min(5).max(5).error(new Error('Un code postal doit obligatoirement être saisi')),
      codeCommune: Joi.string().trim().required().min(4).max(5).error(new Error('Un code commune doit obligatoirement être saisi')),
      ville: Joi.string().trim().required().min(3).max(60).error(new Error('Une ville doit obligatoirement être saisie')),
    },
    location: Joi.object().required().error(new Error('La localisation du lieu d\'activité doit obligatoirement être saisie')),
    itinerant: Joi.boolean().error(new Error('Une itinérance doit obligatoirement être saisie')),
    // eslint-disable-next-line max-len
    typeAcces: Joi.array().items(Joi.string().trim().valid('libre', 'rdv', 'prive')).min(1).required().error(new Error('Au moins un type d\'accès doit obligatoirement être indiqué')),
    horaires: Joi.array().required().error(new Error('Les horaires sont invalides')),
    emailPro: Joi.string().allow('', null).pattern(regExpEmail).error(new Error('Une adresse email valide doit être saisie')),
    telephonePro: Joi.string().allow('', null).pattern(regExpNumero).error(new Error('Un numéro de téléphone valide doit être saisi')),
    siret: Joi.string().trim().allow('', null).pattern(regExpSiret).min(14).max(14).error(new Error('Un siret valide de 14 chiffres doit être saisi')),
    email: Joi.string().trim().allow('', null).pattern(regExpEmail).error(new Error('Une adresse email valide doit être saisie')),
    // eslint-disable-next-line max-len
    siteWeb: Joi.string().trim().allow('', null).pattern(regExpSiteWeb).error(new Error('Une URL valide doit être saisie (exemple de format valide https://www.le-site-de-ma-structure.fr)')),
    conseillers: Joi.array().error(new Error('Erreur sur le format du conseillers')),
    conseillersItinerants: Joi.array().error(new Error('Erreur sur le format du conseillersItinerants')),
    lieuPrincipalPour: Joi.array().error(new Error('Erreur sur le format du lieuPrincipalPour')),
    structure: Joi.object().error(new Error('Erreur sur le format de la structure')),
    updatedAt: Joi.date().error(new Error('Erreur sur le format du updateAt')),
    updatedBy: Joi.object().error(new Error('Erreur sur le format du updatedBy')),
    hasPermanence: Joi.boolean().error(new Error('Erreur sur le format du hasPermanence')),
  }).validate(permanences);

  return error;
};
const updatePermanenceToSchema = (body, conseillerId, database) => assignPermanence(body, conseillerId, database);

const updatePermanencesToSchema = async (body, conseillerId) => await assignPermanences(body, conseillerId);

const validationPermamences = async body => await validationPermanences(body);

const locationDefault = permanence => {
  if (JSON.stringify(permanence?.location?.coordinates) === JSON.stringify([1.849121, 46.6241])) {
    permanence.location = null;
  }
};

module.exports = {
  assignPermanence,
  updatePermanenceToSchema,
  updatePermanencesToSchema,
  validationPermamences,
  locationDefault
};
