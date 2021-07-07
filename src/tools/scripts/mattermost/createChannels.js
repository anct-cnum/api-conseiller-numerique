#!/usr/bin/env node
'use strict';

const axios = require('axios');
require('dotenv').config();
const slugify = require('slugify');

// Ce script permet de créer un canal par département

const process = async () => {

  const departements = require('../../../../data/imports/departements-region.json');

  const result = await axios({
    method: 'post',
    url: `https://discussion.conseiller-numerique.gouv.fr/api/v4/users/login`,
    headers: {
      'Content-Type': 'application/json'
    },
    // TODO: changer LOGIN_ID et PASSWORD
    data: { 'login_id': 'LOGIN_ID', 'password': 'PASSWORD' }
  });

  const token = result.request.res.headers.token;

  departements.forEach(async departement => {
    const displayName = `${departement.num_dep} - ${departement.dep_name}`;
    slugify.extend({ '-': ' ' });
    slugify.extend({ '\'': ' ' });
    const name = slugify(departement.dep_name, { replacement: '', lower: true });
    console.log(name);
    try {
      await axios({
        method: 'post',
        url: `https://discussion.conseiller-numerique.gouv.fr/api/v4/channels`,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        // TODO : remplacer TEAMID par celui de l'équipe concerné
        data: {
          'team_id': 'TEAMID',
          'name': name,
          'display_name': displayName,
          'type': 'P'
        }
      });
    } catch (e) {
      console.log(e);
    }
  });

};

process();
