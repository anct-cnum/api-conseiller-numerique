#!/usr/bin/env node
'use strict';

const { execute } = require('../utils');

// node src/tools/scripts/switchMailSecondaireCoordinateur.js

execute(__filename, async ({ logger, db }) => {
    const coordinateurs = await db.collection('conseillers').find({ 'statut': 'RECRUTE', estCoordinateur: true }).toArray();

    let count = 0;
    let countEmailProSecondaire = 0;
    let countEmailPerso = 0;
    let idCoordoEmailPerso = [];
    let promises = [];

    logger.info('Remplacer l\'identifiant prenom.nom@conseiller-numerique.fr par le mail secondaire ou personnelle...');

    coordinateurs.forEach(conseiller => {
        promises.push(new Promise(async resolve => {
            const user = await db.collection('users').findOne({ 'entity.$id': conseiller._id });
            const query = {
                email: ''
            }
            if (!user) {
                logger.error(`Coordinateur id: ${conseiller.idPG} (${conseiller.emailCN.adress}) non trouvé dans la collection user !`);
                return resolve();
            }
            if (conseiller?.emailPro) {
                query.email = conseiller.emailPro;
                countEmailProSecondaire++;
            } else {
                query.email = conseiller.email;
                countEmailPerso++;
                idCoordoEmailPerso.push(conseiller.idPG);
            }
            const checkUserExist = await db.collection('users').findOne({ name: query.email });
            if (checkUserExist) {
                logger.error(`Coordinateur id: ${conseiller.idPG} (${conseiller.emailCN.adress}) : conflit, email déjà existante => ${query.email}`);
                return resolve();
            }
            await db.collection('users').updateOne({ _id: user._id }, { $set: { name: query.email }, $unset: { sub: '' } });
            count++;
            resolve();
        }));
    });
    await Promise.all(promises);
    logger.info(`${count}/${coordinateurs.length} coordinateur(s) mis à jour dont : \r\n
    - ${countEmailProSecondaire} avec l'adresse éléctronique pro secondaire\r\n
    - ${countEmailPerso} avec l'adresse éléctronique perso (${idCoordoEmailPerso})`);
});

