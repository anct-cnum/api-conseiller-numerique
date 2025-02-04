#!/usr/bin/env node
'use strict';
require('dotenv').config();
const { program } = require('commander');
const { execute } = require('../../utils');
const { DBRef, ObjectID } = require('mongodb');
const utils = require('../../../utils/index');
const dayjs = require('dayjs');
const { getChannel, joinChannel, deleteMemberChannel, joinTeam, deleteJoinTeam, getIdUserChannel } = require('../../../utils/mattermost');
const slugify = require('slugify');
const departements = require('../../../../data/imports/departements-region.json');
slugify.extend({ '-': ' ' });
slugify.extend({ '\'': ' ' });

const formatDate = date => dayjs(date.replace(/^(.{2})(.{1})(.{2})(.{1})(.{4})$/, '$5-$3-$1'), 'YYYY-MM-DD').toDate();

const majMiseEnRelationStructureRupture = db => async (idCNFS, nouvelleSA, ancienneSA) => {
  await db.collection('misesEnRelation').updateOne(
    {
      'conseiller.$id': idCNFS,
      'structure.$id': ancienneSA,
      'statut': { $in: ['finalisee', 'nouvelle_rupture'] }
    },
    {
      $set: {
        statut: 'finalisee_rupture',
        transfert: {
          'destinationStructureId': nouvelleSA,
          'date': new Date()
        }
      }
    }
  );
};
const historiseCollectionRupture = db => async (idCNFS, ancienneSA, dateRupture, motifRupture) => {

  await db.collection('conseillersRuptures').insertOne({
    conseillerId: idCNFS,
    structureId: ancienneSA,
    dateRupture,
    motifRupture
  });
};

const majMiseEnRelationStructureNouvelle = (db, app) => async (idCNFS, nouvelleSA, structureDestination, dateDebutDeContrat, dateFinDeContrat, typeDeContrat, salaireContrat) => {
  const misesEnrelationNouvelleSA = await db.collection('misesEnRelation').findOne({ 'conseiller.$id': idCNFS, 'structure.$id': nouvelleSA });
  const objectContrat = {
    statut: 'finalisee',
    dateDebutDeContrat,
    dateFinDeContrat,
    typeDeContrat,
    ...(salaireContrat && {
      salaire: Number(salaireContrat.replace(',', '.'))
    }),
    ...(utils.checkStructurePhase2(structureDestination?.conventionnement?.statut) && {
      phaseConventionnement: '2'
    })
  };
  if (!misesEnrelationNouvelleSA) {
    const connection = app.get('mongodb');
    const database = connection.substr(connection.lastIndexOf('/') + 1);
    await db.collection('misesEnRelation').insertOne({
      conseiller: new DBRef('conseillers', idCNFS, database),
      structure: new DBRef('structures', nouvelleSA, database),
      createdAt: new Date(),
      conseillerObj: {},
      structureObj: structureDestination,
      ...objectContrat
    });
  } else {
    await db.collection('misesEnRelation').updateOne(
      { 'conseiller.$id': idCNFS, 'structure.$id': nouvelleSA },
      {
        $set: objectContrat
      });
  }
};
const majDataCnfsStructureNouvelle = db => async (idCNFS, nouvelleSA, ancienneSA, dateRupture, motifRupture, structureDestination) => {
  await db.collection('conseillers').updateOne({ _id: idCNFS }, {
    $set: {
      structureId: nouvelleSA,
      codeRegionStructure: structureDestination.codeRegion,
      codeDepartementStructure: structureDestination.codeDepartement,
      hasPermanence: false,
    },
    $push: {
      ruptures: {
        structureId: ancienneSA,
        dateRupture,
        motifRupture
      }
    },
    $unset: {
      supHierarchique: '',
      telephonePro: '',
      emailPro: ''
    },
  });
};

const majConseillerObj = db => async idCNFS => {
  const conseillerAjour = await db.collection('conseillers').findOne({ _id: idCNFS });
  await db.collection('misesEnRelation').updateMany({ 'conseiller.$id': idCNFS }, { $set: { 'conseillerObj': conseillerAjour } });
};
const craCoherenceDateDebutDeContrat = db => async (idCNFS, nouvelleSA, dateDebutDeContrat) => await db.collection('cras').updateMany(
  {
    'conseiller.$id': idCNFS,
    'cra.dateAccompagnement': { '$gte': dateDebutDeContrat }
  }, {
    $set: { 'structure.$id': nouvelleSA }
  });
const updatePermanences = db => async idCNFS => await db.collection('permanences').updateMany(
  {
    $or: [
      { 'conseillers': { $elemMatch: { $eq: idCNFS } } },
      { 'conseillersItinerants': { $elemMatch: { $eq: idCNFS } } },
      { 'lieuPrincipalPour': { $elemMatch: { $eq: idCNFS } } }
    ]
  },
  { $pull: { conseillers: idCNFS, conseillersItinerants: idCNFS, lieuPrincipalPour: idCNFS } }
);
const deletePermanences = db => async idCNFS => {
  const permanences = await db.collection('permanences').find({
    'conseillers': { '$in': [idCNFS] }
  });
  for (let permanence of permanences) {
    if (permanence?.conseillers?.length === 1) {
      await db.collection('permanences').deleteOne({
        '_id': permanence._id
      });
    }
  }
};
const miseAjourMattermostCanaux = db => async (idCNFS, structureDestination, ancienneSA, mattermost) => {
  const CNFS = await db.collection('conseillers').findOne({ _id: idCNFS });
  const ancienneStructure = await db.collection('structures').findOne({ '_id': ancienneSA });
  if (CNFS?.mattermost?.id) {

    if (ancienneStructure.codeDepartement !== structureDestination.codeDepartement) {

      let departementAncienneSA = departements.find(d => `${d.num_dep}` === ancienneStructure.codeDepartement);
      let departementNouvelleSA = departements.find(d => `${d.num_dep}` === structureDestination.codeDepartement);

      if (structureDestination.codeDepartement === '00' && structureDestination.codePostal === '97150') {
        departementNouvelleSA = departements.find(d => `${d.num_dep}` === '971');
      }
      const channelNameNouvelleSA = slugify(departementNouvelleSA.dep_name, { replacement: '', lower: true });
      const resultChannelNouvelleSA = await getChannel(mattermost, null, channelNameNouvelleSA);
      await joinChannel(mattermost, null, resultChannelNouvelleSA.data.id, CNFS.mattermost.id);

      if (ancienneStructure.codeDepartement === '00' && ancienneStructure.codePostal === '97150') {
        departementAncienneSA = departements.find(d => `${d.num_dep}` === '971');
      }
      const channelNameAncienneSA = slugify(departementAncienneSA.dep_name, { replacement: '', lower: true });
      const resultChannelAncienneSA = await getChannel(mattermost, null, channelNameAncienneSA);
      await getIdUserChannel(mattermost, null, resultChannelAncienneSA.data.id, CNFS.mattermost.id).then(() =>
        deleteMemberChannel(mattermost, null, resultChannelAncienneSA.data.id, CNFS.mattermost.id)
      ).catch(error => console.log('error (partie departement):', error.response.data.message));
    }

    const regionNameAncienneSA = departements.find(d => `${d.num_dep}` === ancienneStructure.codeDepartement)?.region_name;
    let hubAncienneSA = await db.collection('hubs').findOne({ region_names: { $elemMatch: { $eq: regionNameAncienneSA } } });
    if (hubAncienneSA === null) {
      // Cas Saint Martin => on les regroupe au hub Antilles-Guyane
      if (ancienneStructure.codeDepartement === '00' && ancienneStructure.codeCom === '978') {
        hubAncienneSA = await db.collection('hubs').findOne({ departements: { $elemMatch: { $eq: '973' } } });
      } else {
        hubAncienneSA = await db.collection('hubs').findOne({ departements: { $elemMatch: { $eq: `${ancienneStructure.codeDepartement}` } } });
      }
    }
    const regionNameNouvelleSA = departements.find(d => `${d.num_dep}` === structureDestination.codeDepartement)?.region_name;
    let hubNouvelleSA = await db.collection('hubs').findOne({ region_names: { $elemMatch: { $eq: regionNameNouvelleSA } } });
    if (hubNouvelleSA === null) {
      // Cas Saint Martin => on les regroupe au hub Antilles-Guyane
      if (structureDestination.codeDepartement === '00' && structureDestination.codeCom === '978') {
        hubNouvelleSA = await db.collection('hubs').findOne({ departements: { $elemMatch: { $eq: '973' } } });
      } else {
        hubNouvelleSA = await db.collection('hubs').findOne({ departements: { $elemMatch: { $eq: `${structureDestination.codeDepartement}` } } });
      }
    }
    if ((hubAncienneSA !== null) && (hubAncienneSA?.channelId !== hubNouvelleSA?.channelId)) {
      await getIdUserChannel(mattermost, null, hubAncienneSA.channelId, CNFS.mattermost.id).then(() =>
        deleteMemberChannel(mattermost, null, hubAncienneSA.channelId, CNFS.mattermost.id)
      ).catch(error => console.log('error (partie hub):', error.response.data.message));

      if (hubNouvelleSA === null) {
        await deleteJoinTeam(mattermost, null, mattermost.hubTeamId, CNFS.mattermost.id);
        await db.collection('conseillers').updateOne({ _id: CNFS._id }, {
          $unset: { 'mattermost.hubJoined': '' }
        });
        await db.collection('misesEnRelation').updateMany({ 'conseiller.$id': CNFS._id }, {
          $unset: { 'conseillerObj.mattermost.hubJoined': '' }
        });
      }
    }
    if ((hubNouvelleSA !== null) && (hubAncienneSA?.channelId !== hubNouvelleSA?.channelId)) {
      await joinTeam(mattermost, null, mattermost.hubTeamId, CNFS.mattermost.id);
      await joinChannel(mattermost, null, hubNouvelleSA.channelId, CNFS.mattermost.id);
      await db.collection('conseillers').updateOne({ _id: CNFS._id }, {
        $set: { 'mattermost.hubJoined': true }
      });
      await db.collection('misesEnRelation').updateMany({ 'conseiller.$id': CNFS._id }, {
        $set: { 'conseillerObj.mattermost.hubJoined': true }
      });
    }
  }
};

const emailsStructureAncienne = db => async (emails, cnfsRecrute, ancienneSA) => {
  const structure = await db.collection('structures').findOne({ _id: ancienneSA });
  const messageStructure = emails.getEmailMessageByTemplateName('conseillerRuptureStructure');
  await messageStructure.send(cnfsRecrute, structure.contact.email);
};

const emailsCnfsNotification = db => async (emails, idCNFS) => {
  const conseiller = await db.collection('conseillers').findOne({ _id: idCNFS });
  const messageConseillerTransfert = emails.getEmailMessageByTemplateName('conseillerTransfertStructure');
  await messageConseillerTransfert.send(conseiller.emailCN.address);
};

execute(__filename, async ({ db, logger, exit, app, emails, Sentry }) => {

  program.option('-i, --id <id>', 'id: id Mongo du conseiller à transférer');
  program.option('-a, --ancienne <ancienne>', 'ancienne: id mongo structure qui deviendra ancienne structure du conseiller');
  program.option('-r, --rupture <rupture>', 'rupture: date de rupture DD/MM/AAAA');
  program.option('-m, --motif <motif>', 'motif: motif de la rupture');
  program.option('-n, --nouvelle <nouvelle>', 'nouvelle: id mongo structure de destination');
  program.option('-ddc, --dateDebutContrat <dateDebutContrat>', 'dateDebutContrat: la date de début de contrat DD/MM/AAAA');
  program.option('-dfc, --dateFinContrat <dateFinContrat>', 'dateFinContrat: la date de fin de contrat DD/MM/AAAA');
  program.option('-tc, --typeContrat <typeContrat>', 'typeContrat: le type de contrat');
  program.option('-sc, --salaireContrat <salaireContrat>', 'salaireContrat: le salaire du contrat');
  program.option('-q, --quota', 'quota: pour désactiver le bridage du nombre de poste validé en Coselec');
  program.option('-ntf, --notificationConseiller', 'notificationConseiller: pour activer l\'envoi de la notification du mail au conseiller pour le transfert');
  program.helpOption('-e', 'HELP command');
  program.parse(process.argv);

  const { id, ancienne, nouvelle, rupture, dateDebutContrat, dateFinContrat, typeContrat, salaireContrat, motif, quota, notificationConseiller } = program.opts();
  if (!id || !ancienne || !nouvelle || !rupture || !dateDebutContrat || !typeContrat || !dateFinContrat || !motif) {
    exit('Paramètres invalides. Veuillez entrer les 8 paramètres requis');
    return;
  }
  const mattermost = app.get('mattermost');
  const idCNFS = new ObjectID(id);
  const ancienneSA = new ObjectID(ancienne);
  const nouvelleSA = new ObjectID(nouvelle);
  const dateRupture = formatDate(rupture);
  const dateDebutDeContrat = formatDate(dateDebutContrat);
  const dateFinDeContrat = formatDate(dateFinContrat);
  const typeDeContrat = typeContrat;
  const motifRupture = motif;
  const typeDeContratValid = ['CDD', 'CDI', 'PEC', 'contrat_de_projet_public'];
  const regexFloatNumber = /^(\d+(?:[.]\d*)?)$/;
  const salaireMinimum = 1709.28;

  const cnfsRecrute = await db.collection('misesEnRelation').findOne(
    {
      'conseiller.$id': idCNFS,
      'structure.$id': ancienneSA,
      'statut': { $in: ['finalisee', 'nouvelle_rupture'] }
    });
  if (!cnfsRecrute) {
    exit(`Le Cnfs avec l'id ${idCNFS} n'est pas recruté.`);
    return;
  }
  if (!typeDeContratValid.includes(typeDeContrat)) {
    exit(`Le type de contrat ${typeDeContrat} n'est pas valide`);
    return;
  }
  if (salaireContrat && !regexFloatNumber.test(salaireContrat)) {
    exit(`Le salaire ${salaireContrat} n'est pas valide`);
    return;
  }
  if (salaireContrat && Number(salaireContrat) < salaireMinimum) {
    exit(`Le salaire de ${salaireContrat}€ est inférieur au SMIC`);
    return;
  }
  const structureDestination = await db.collection('structures').findOne({ '_id': nouvelleSA });
  if (structureDestination?.statut !== 'VALIDATION_COSELEC') {
    exit(`La structure destinataire n'est pas 'VALIDATION_COSELEC' mais ${structureDestination.statut}`);
    return;
  }
  let dernierCoselec = utils.getCoselec(structureDestination);
  const misesEnRelationRecrutees = await db.collection('misesEnRelation').countDocuments({
    'statut': { $in: ['recrutee', 'finalisee'] },
    'structure.$id': structureDestination._id
  });
  if (misesEnRelationRecrutees >= dernierCoselec.nombreConseillersCoselec && !quota) {
    exit(`La structure destinataire est seulement autorisé à avoir ${dernierCoselec.nombreConseillersCoselec} conseillers et en a déjà ${misesEnRelationRecrutees} validé(s)/recruté(s)`);
    return;
  }
  try {
    await majMiseEnRelationStructureRupture(db)(idCNFS, nouvelleSA, ancienneSA);
    await historiseCollectionRupture(db)(idCNFS, ancienneSA, dateRupture, motifRupture);
    await majMiseEnRelationStructureNouvelle(db, app)(
      idCNFS,
      nouvelleSA,
      structureDestination,
      dateDebutDeContrat,
      dateFinDeContrat,
      typeDeContrat,
      salaireContrat
    );
    await majDataCnfsStructureNouvelle(db)(
      idCNFS,
      nouvelleSA,
      ancienneSA,
      dateRupture,
      motifRupture,
      structureDestination
    );
    await majConseillerObj(db)(idCNFS);
    await craCoherenceDateDebutDeContrat(db)(idCNFS, nouvelleSA, dateDebutDeContrat);
    await deletePermanences(db)(idCNFS);
    await updatePermanences(db)(idCNFS);
    await miseAjourMattermostCanaux(db)(idCNFS, structureDestination, ancienneSA, mattermost);
    await emailsStructureAncienne(db)(emails, cnfsRecrute, ancienneSA);
    if (notificationConseiller) {
      await emailsCnfsNotification(db)(emails, idCNFS);
    }
  } catch (error) {
    logger.error(error);
    Sentry.captureException(error);
  }

  logger.info(`Le conseiller id: ${idCNFS} a été transféré de la structure: ${ancienneSA} vers la structure: ${nouvelleSA} (${structureDestination.nom})`);
  exit();
});
