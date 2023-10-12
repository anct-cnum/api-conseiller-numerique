#!/usr/bin/env node
'use strict';

const path = require('path');
const fs = require('fs');

const getPermanencesDoublonsByLocation = async db => await db.collection('permanences_temp').aggregate([
  { '$unwind': '$location' },
  { '$group': {
    '_id': '$location',
    'permanences': { '$push': '$$ROOT' },
    'count': { '$sum': 1 }
  } },
  { '$match': {
    'count': { '$gt': 1 }
  } },
  { '$project': {
    '_id': 0,
    'location': '$_id',
    'permanences': '$permanences'
  } }
]).toArray();

const getPermanencesDoublonsByAdresse = async db => await db.collection('permanences_temp').aggregate([
  { '$unwind': '$adresse' },
  { '$unwind': '$location' },
  { '$group': {
    '_id': { 'adresse': '$adresse', 'location': '$location' },
    'permanences': { '$push': '$$ROOT' },
    'count': { '$sum': 1 }
  } },
  { '$match': {
    'count': { '$gt': 1 }
  } },
  { '$project': {
    '_id': 0,
    'location': '$_id.location',
    'permanences': '$permanences'
  } }
]).toArray();

const getPermanencesDoublons = async db => {
  const permByLocation = await getPermanencesDoublonsByLocation(db);
  const permByAdresse = await getPermanencesDoublonsByAdresse(db);
  permByLocation.forEach(pBylocation => {
    if (!permByAdresse.find(pByAdresse =>
      pByAdresse.location.coordinates[0] === pBylocation.location.coordinates[0] &&
      pByAdresse.location.coordinates[1] === pBylocation.location.coordinates[1])) {
      permByAdresse.push(pBylocation);
    }
  });
  return permByAdresse;
};

const createCsvFile = (csvName, csvHeader, dataType, datas) => {
  let csvFile = path.join(__dirname, '../../../../data/exports', csvName + '.csv');
  let file = fs.createWriteStream(csvFile, {
    flags: 'w'
  });
  file.write(csvHeader + '\n');
  let writeLine = '';

  datas.forEach(data => {
    if (dataType === 'permanences') {
      for (let i = 0; i < data.permanences.length; i++) {
        if (i > 0) {
          writeLine += `${String(data.permanences[i].location.coordinates)};${data.permanences[i]._id};`;
          writeLine += `${data.permanences[i].structure.oid};${data.permanences[i].conseillers};`;
          writeLine += `${data.permanences[i].lieuPrincipalPour};${data.permanences[0]._id}`;
          writeLine += `\n`;
        }
      }
    } else if (dataType === 'erreurComparaison') {
      writeLine += data + `\n`;
    }
  });
  file.write(writeLine);
  file.close();
};

module.exports = {
  getPermanencesDoublons,
  createCsvFile,
};
