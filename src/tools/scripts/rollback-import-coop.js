#!/usr/bin/env node
'use strict';

require('dotenv').config();

const { execute } = require('../utils');
const { program } = require('commander');
const { v4: uuidv4 } = require('uuid');
const { deleteAccount } = require('../../utils/mattermost');

program.option('-c, --idConseiller <idConseiller>', 'IdPG du conseiller', parseInt);
program.option('-s, --idStructure <idStructure>', 'IdPG de la structure', parseInt);
program.parse(process.argv);

const configPG = {
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
  db: process.env.PGDATABASE,
  port: process.env.PGPORT,
  sslMode: process.env.PGSSLMODE,
  host: process.env.PGHOST
};

execute(__filename, async ({ db, logger, Sentry, mattermost }) => {

  await new Promise(async (resolve, reject) => {

    if (Object.values(configPG).includes(undefined)) {
      logger.warn(`ATTENTION : les 6 vars d'env PG n'ont pas été configurées`);
      reject();
      return;
    }
    const { idStructure, idConseiller } = program.opts();

    if ((~~idConseiller === 0) || (~~idStructure === 0)) {
      logger.warn(`L'id conseiller ou id structure n'est pas correct. (idStructure: ${~~idStructure}, ~~idConseiller: ${~~idConseiller}) `);
      reject();
      return;
    }

    const conseiller = await db.collection('conseillers').findOne({ idPG: ~~idConseiller });
    const structure = await db.collection('structures').findOne({ idPG: ~~idStructure });
    const miseEnRelation = await db.collection('misesEnRelation').findOne({
      'conseiller.$id': conseiller?._id,
      'structure.$id': structure?._id,
      'statut': 'finalisee'
    });

    if (miseEnRelation === null) {
      logger.warn(`Recrutement inexistante entre cette structure ${idStructure} et ce conseiller ${idConseiller}`);
      reject();
      return;
    }
    const updatedAt = new Date();
    // Modification de la mise en relation
    await db.collection('misesEnRelation').updateOne(
      { _id: miseEnRelation._id },
      {
        $set: {
          'statut': 'nouvelle',
          'conseillerObj.updatedAt': updatedAt,
        },
        $unset: {
          dateRecrutement: '',
          dateDebutDeContrat: '',
          dateFinDeContrat: '',
          typeDeContrat: '',
          salaire: '',
        }
      });

    //Modification des doublons potentiels
    await db.collection('conseillers').updateMany(
      {
        _id: { $ne: conseiller._id },
        email: conseiller.email
      },
      {
        $set: {
          disponible: true,
          updatedAt
        }
      }
    );

    //Cas spécifique : conseiller recruté s'est réinscrit sur le formulaire d'inscription => compte coop + compte candidat
    const userCandidatAlreadyPresent = await db.collection('users').findOne({
      'roles': { $in: ['candidat'] },
      'name': conseiller.email
    });
    const userCoop = await db.collection('users').findOne({
      'roles': { $in: ['conseiller'] },
      'entity.$id': conseiller._id
    });
    if (userCandidatAlreadyPresent !== null) {
      await db.collection('users').deleteOne({ _id: userCoop._id });
      await db.collection('conseillers').updateOne({ _id: conseiller._id }, {
        $set: {
          userCreated: false,
          updatedAt
        }
      });
      await db.collection('misesEnRelation').updateMany(
        { 'conseiller.$id': conseiller._id },
        { $set: {
          'conseillerObj.userCreated': false,
          'conseillerObj.updatedAt': updatedAt
        } }
      );
    }


    //Passage en compte candidat avec email perso
    let userToUpdate = {
      name: conseiller.email,
      roles: ['candidat'],
      token: uuidv4(),
      tokenCreatedAt: new Date(),
      mailSentDate: null, //pour le mécanisme de relance d'invitation candidat
      passwordCreated: false,
    };
    if (userCoop !== null && userCandidatAlreadyPresent === null) {
      //Maj name si le compte coop a été activé
      if (conseiller.email !== userCoop.name) {
        await db.collection('users').updateOne({ _id: userCoop._id }, {
          $set: { ...userToUpdate }
        });
      } else {
        const { name: _, ...userWithoutName } = userToUpdate; //nécessaire pour ne pas avoir d'erreur de duplicate key
        await db.collection('users').updateOne({ _id: userCoop._id }, {
          $set: { ...userWithoutName }
        });
      }
    }
    //Suppression compte Mattermost
    if (conseiller.mattermost?.id !== undefined) {
      await deleteAccount(mattermost, conseiller, db, logger, Sentry);
    }
    // Suppression des infos de recrutement dans le doc conseiller
    await db.collection('conseillers').updateOne(
      { _id: conseiller._id },
      { $set: { disponible: true },
        $unset: {
          statut: '',
          estRecrute: '',
          datePrisePoste: '',
          dateFinFormation: '',
          structureId: '',
          emailCNError: '',
          emailCN: '',
          emailPro: '',
          mattermost: '',
          resetPasswordCNError: '',
          codeRegionStructure: '',
          codeDepartementStructure: '',
          hasPermanence: '',
          coordinateurs: '',
          mailProAModifier: '',
          tokenChangementMailPro: '',
          tokenChangementMailProCreatedAt: '',
          mailAModifier: '',
          tokenChangementMail: '',
          tokenChangementMailCreatedAt: ''
        }
      });
    // partie mise à jour des conseillerObj dans les misesEnRelation
    const conseillerMAJ = await db.collection('conseillers').findOne({ idPG: ~~idConseiller });
    await db.collection('misesEnRelation').updateMany(
      { 'conseiller.$id': conseillerMAJ._id },
      { $set: { 'conseillerObj': conseillerMAJ } }
    );
    logger.info(`Annulation du recrutement OK pour le conseiller ${conseiller.idPG}`);
    resolve();
  });
});
