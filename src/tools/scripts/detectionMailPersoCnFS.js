#!/usr/bin/env node
'use strict';
require('dotenv').config();

const { execute } = require('../utils');

const getConseillersMailPersoCnFS = db => async domain =>
  await db.collection('conseillers').find({ email: { $regex: domain } }).toArray();

const getContratsByConseiller = db => async id => await db.collection('misesEnRelation').find({
  'conseiller.$id': id,
  'statut': { $in: ['finalisee', 'nouvelle_rupture', 'terminee', 'finalisee_rupture', 'recrutee'] }
}).toArray();

const getConseillersMailAModifierCnFS = db => async domain =>
  await db.collection('conseillers').find({ mailAModifier: { $regex: domain } }).toArray();

execute(__filename, async ({ app, db, logger, exit }) => {

  const gandi = app.get('gandi');
  const conseillersMailPersoCnFS = await getConseillersMailPersoCnFS(db)(gandi.domain);

  logger.info(`${conseillersMailPersoCnFS.length} mails perso en ${gandi.domain}`);

  for (const conseiller of conseillersMailPersoCnFS) {
    if (
      conseiller.userCreated === false &&
      conseiller.userCreationError === true &&
      !['RECRUTE', 'RUPTURE'].includes(conseiller.statut) &&
      !conseiller.ruptures &&
      !conseiller.mattermost &&
      !conseiller.emailCN &&
      !conseiller.groupeCRA
    ) {
      // Vérification des mises en relation
      const contrats = await getContratsByConseiller(db)(conseiller._id);

      if (contrats.length > 0) {
        logger.warn(`Le candidat ${conseiller.idPG} a ${contrats.length} contrat(s) : ${JSON.stringify(contrats.map(contrat => contrat.statut))}`);
      } else {
        logger.info(`Le candidat ${conseiller.idPG} peut être supprimé par l'admin`);
      }
    } else {
      logger.error(`Le candidat ${conseiller.idPG} ne peut pas être supprimé`);
    }
  }

  // Autofix demandes de changement en cours de mail perso en CnFS
  const conseillersMailAModifierCnFS = await getConseillersMailAModifierCnFS(db)(gandi.domain);
  for (const conseiller of conseillersMailAModifierCnFS) {
    await db.collection('conseillers').updateOne(
      {
        _id: conseiller._id
      },
      {
        $unset: {
          mailAModifier: '',
          tokenChangementMail: '',
          tokenChangementMailCreatedAt: ''
        }
      }
    );
    logger.info(`Autofix conseiller ${conseiller.idPG} - suppression de la demande en cours de chg de mail perso en mail CnFS`);
  }

  exit();
});
