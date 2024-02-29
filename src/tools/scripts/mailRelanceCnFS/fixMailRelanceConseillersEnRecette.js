#!/usr/bin/env node
'use strict';

require('dotenv').config();

const { execute } = require('../../utils');
const dayjs = require('dayjs');
const { program } = require('commander');

program.description('Fix conseillers en recette pour les relances M+1 et M+1,5')
.option('--limit [limit]', 'limit le nombre de mise à jour réalisées (default: 1)', parseInt)
.helpOption('-e', 'HELP command')
.parse(process.argv);

const dateDuJourMoins15jours = new Date(dayjs(Date.now()).subtract(15, 'day'));
execute(__filename, async ({ db, logger, exit, app }) => {
  const mongodb = app.get('mongodb');
  if (!mongodb.includes('local') && !mongodb.includes('bezikra')) {
    exit('Vous devez être connecté à la base de données en recette ou en local pour lancer ce script');
    return;
  }
  const { limit = 1 } = program.opts();
  await db.collection('conseillers').updateMany({
    'statut': { $eq: 'RECRUTE' },
    'estCoordinateur': { $ne: true },
    'groupeCRA': { $in: [3, 4] },
    'groupeCRAHistorique': {
      $elemMatch: {
        'nbJourDansGroupe': { $exists: false },
        'mailSendConseillerM+1': { $exists: false }
      }
    }
  },
  {
    $set: {
      groupeCRAHistorique: [{
        'mailSendConseillerM+1': true,
        'mailSendStructureM+1': true,
        'mailSendSupHierarchiqueM+1': true,
        'mailSendConseillerM+1,5': true,
        'mailSendStructureM+1,5': true,
        'mailSendSupHierarchiqueM+1,5': true,
        'dateMailSendConseillerM+1': dateDuJourMoins15jours,
        'dateMailSendStructureM+1': dateDuJourMoins15jours,
        'dateMailSendSupHierarchiqueM+1': dateDuJourMoins15jours,
        'dateMailSendConseillerM+1,5': new Date(),
        'dateMailSendStructureM+1,5': new Date(),
        'dateMailSendSupHierarchiqueM+1,5': new Date(),
        'dateDeChangement': dateDuJourMoins15jours,
        'numero': 3
      }]
    }
  },
  {
    limit: limit
  }
  );

  logger.info('les conseillers en recette ont été mis à jour, il ne devrait plus y avoir de relance M+1 et M+1,5');
});
