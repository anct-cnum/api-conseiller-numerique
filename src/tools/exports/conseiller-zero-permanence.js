#!/usr/bin/env node
'use strict';
const path = require('path');
const fs = require('fs');
const { execute } = require('../utils');

execute(__filename, async ({ logger, db }) => {
  const conseillers = await db.collection('conseillers').find({ statut: 'RECRUTE' }).toArray();
  let promises = [];
  let count = 0;
  logger.info(`Generating CSV file...`);
  let csvFile = path.join(__dirname, '../../../data/exports', 'conseiller-zero-permanence.csv');

  let file = fs.createWriteStream(csvFile, {
    flags: 'w'
  });

  file.write('id du conseiller; Nom; Prenom;Email perso du conseiller (saisi lors de son inscription);email @conseiller-numerique.fr;Email Pro saisi dans l\'espace Coop;Téléphone perso (saisi avant d\'etre recruté);Téléphone Pro (saisi dans l\'espace coop);conseiller coordinateur;Espace COOP activé;Nom SA;Siret SA;SA email;SA téléphone\n');
  conseillers.forEach(cnfs => {
    promises.push(new Promise(async resolve => {
      const permanences = await db.collection('permanences').countDocuments({ conseillers: { '$in': [cnfs._id] } });
      if (permanences === 0) {
        const sa = await db.collection('structures').findOne({ _id: cnfs.structureId });
        file.write(`${cnfs.idPG};${cnfs.nom};${cnfs.prenom};${cnfs.email};${cnfs?.emailCN?.address};${cnfs?.emailPro ?? 'Non renseigné'};${cnfs.telephone ?? 'Non renseigné'};${cnfs.telephonePro ?? 'Non renseigné'};${cnfs?.estCoordinateur === true ? 'OUI' : 'NON'};${cnfs?.mattermost?.login ? 'OUI' : 'NON'};${sa.nom};${sa?.siret};${sa.contact?.email};${sa.contact?.telephone};\n`);
        count++;
      }
      resolve();
    }));
  });
  await Promise.all(promises);
  logger.info(`Il y a ${count} conseiller(s) qui ont saisi 0 permanences / ${conseillers.length}`);
  file.close();
});
