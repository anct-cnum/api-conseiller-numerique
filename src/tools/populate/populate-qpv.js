#!/usr/bin/env node
'use strict';

const { execute } = require('../utils');
const { program } = require('commander');
const circle = require('@turf/circle');

program
.option('-c, --csv <path>', 'CSV file path');

program.parse(process.argv);

execute(__filename, async ({ db, logger }) => {
  const store = async (s, qpv, quartiers) => {
    const filter = {
      '_id': s._id,
    };

    const updateDoc = {
      $set: {
        qpvStatut: qpv,
        qpvListe: quartiers
      }
    };

    const options = { };

    try {
      await db.collection('structures').updateOne(filter, updateDoc, options);
    } catch (error) {
      logger.info(`Erreur MongoDB : ${error.message}`);
    }

    logger.info(
      `qpv,OK,${s._id},${s.idPG},${s.nom},${qpv},${quartiers.length}`);
  };

  // Chercher les structures dont on n'a pas encore les infos de QPV
  const match = await db.collection('structures').find({
    location: { '$exists': true },
    qpv: { '$exists': false }
  });

  let s;
  while ((s = await match.next())) {
    let qpv;
    let quartiers;

    // indiquer « Sans objet » pour les SA qui ont une couverture > maille communale (communautés de communes, départements, etc).
    if (['DEPARTEMENT', 'REGION', 'EPCI'].includes(s.type)) {
      qpv = 'Sans objet';
      quartiers = [];
      await store(s, qpv, quartiers);
    }

    // indiquer « OUI/NON » pour les SA qui ont une couverture = ou < maille communale ou infra-communale (communes, CCAS, associations, etc) ;

    // OUI : la SA (= ou < maille communale) possède un ou plusieurs QPV (SA = maille communale)/est située au sein d’un QPV (SA < maille communale).
    // NON : la SA (= ou < maille communale) ne possède pas de QPV/n’est pas située au sein d’un QPV.

    if (s.type === 'COMMUNE' && s.codeCommune !== '' && s.codeCommune !== '.') {
      // Est-ce qu'elle contient au moins un QPV ?

      const commune = await db.collection('communes').findOne({
        'properties.code': s.codeCommune
      });

      quartiers = await db.collection('qpv').find(
        { 'geometry':
          { '$geoIntersects':
            { '$geometry': commune.geometry }
          }
        }
      ).toArray();

      qpv = quartiers.length > 0 ? 'Oui' : 'Non';
      await store(s, qpv, quartiers);
    }

    if (['COLLECTIVITE', 'PRIVATE'].includes(s.type) && s.codeCommune !== '' && s.codeCommune !== '.' && s.coordonneesInsee !== undefined) {

      const radius = 0.1;
      const c = circle.default(s.coordonneesInsee.coordinates, radius);

      quartiers = await db.collection('qpv').find(
        { 'geometry':
          { '$geoIntersects':
            { '$geometry': c.geometry }
          }
        }
      ).toArray();

      qpv = quartiers.length > 0 ? 'Oui' : 'Non';
      await store(s, qpv, quartiers);
    }
  }
});
