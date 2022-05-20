#!/usr/bin/env node
'use strict';

require('dotenv').config();

const { execute } = require('../utils');
const { program } = require('commander');

program.option('-c, --idConseiller <idConseiller>', 'IdPG du conseiller', parseInt);
program.option('-s, --idStructure <idStructure>', 'IdPG de la structure', parseInt);
program.parse(process.argv);

execute(__filename, async ({ db, logger }) => {

  await new Promise(async (resolve, reject) => {

    const { idStructure, idConseiller } = program;

    if (~~idConseiller === 0) {
      logger.warn(`L'id conseiller n'est pas correct`);
      reject();
      return;
    }

    if (~~idStructure === 0) {
      logger.warn(`L'id structure n'est pas correct`);
      reject();
      return;
    }

    const conseiller = await db.collection('conseillers').findOne({ idPG: ~~idConseiller });
    const structure = await db.collection('structures').findOne({ idPG: ~~idStructure });
    const miseEnRelation = await db.collection('misesEnRelation').findOne({
      'conseiller.$id': conseiller?._id,
      'structure.$id': structure?._id,
      'statut': 'finalisee_rupture'
    });

    if (miseEnRelation === null) {
      logger.warn(`Rupture inexistante entre cette structure ${idStructure} et ce conseiller ${idConseiller}`);
      reject();
      return;
    }

    // Suppression dans l'historisation
    await db.collection('conseillersRuptures').deleteOne({ conseillerId: conseiller._id, structureId: structure._id });

    // Suppression des infos de rupture dans le doc conseiller
    await db.collection('conseillers').updateOne(
      {
        _id: conseiller._id,
        ruptures: { $elemMatch: { structureId: structure._id } },
      },
      {
        $unset: {
          'mattermost': '',
          'emailCN': '',
          'ruptures.$': ''
        }
      });

    // Modification de la mise en relation
    await db.collection('misesEnRelation').updateOne(
      { _id: miseEnRelation._id },
      {
        $set: {
          statut: 'recrutee'
        },
        $unset: {
          dateRupture: '',
          motifRupture: '',
          mailCnfsRuptureSentDate: '',
          resendMailCnfsRupture: ''
        }
      });

    logger.info(`Annulation de la rupture OK, conseiller ${conseiller.idPG} à repasser dans l'import Coop`);
    resolve();
  });
});

