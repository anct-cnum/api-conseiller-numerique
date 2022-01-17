const updatePermanenceToSchema = body => ({
  conseillerId: body.conseillerId,
  structureId: body.structureId,
  nomEnseigne: body.nomEnseigne,
  numeroTelephone: String(body.numeroTelephone),
  email: String(body.email),
  siteWeb: body.siteWeb,
  siret: body.siret,
  adresse: body.adresse,
  horaires: [
    {
      matin: [body.horaires[0].matin[0], body.horaires[0].matin[1]],
      apresMidi: [body.horaires[0].apresMidi[0], body.horaires[0].apresMidi[1]]
    },
    {
      matin: [body.horaires[1].matin[0], body.horaires[1].matin[1]],
      apresMidi: [body.horaires[1].apresMidi[0], body.horaires[1].apresMidi[1]]
    },
    {
      matin: [body.horaires[2].matin[0], body.horaires[2].matin[1]],
      apresMidi: [body.horaires[2].apresMidi[0], body.horaires[2].apresMidi[1]]
    },
    {
      matin: [body.horaires[3].matin[0], body.horaires[3].matin[1]],
      apresMidi: [body.horaires[3].apresMidi[0], body.horaires[3].apresMidi[1]]
    },
    {
      matin: [body.horaires[4].matin[0], body.horaires[4].matin[1]],
      apresMidi: [body.horaires[4].apresMidi[0], body.horaires[4].apresMidi[1]]
    },
    {
      matin: [body.horaires[5].matin[0], body.horaires[5].matin[1]],
      apresMidi: [body.horaires[5].apresMidi[0], body.horaires[5].apresMidi[1]]
    },
    {
      matin: [body.horaires[6].matin[0], body.horaires[6].matin[1]],
      apresMidi: [body.horaires[6].apresMidi[0], body.horaires[6].apresMidi[1]]
    }
  ],
  itinerant: body.itinerant,
  updatedAt: new Date()
});

module.exports = {
  updatePermanenceToSchema
};
