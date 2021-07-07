#!/usr/bin/env node
'use strict';

const axios = require('axios');
require('dotenv').config();

// Ce script permet de faire rejoindre un utilisateur sur la totalité des canaux

const process = async () => {

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

  const channels = await axios({
    method: 'get',
    url: `https://discussion.conseiller-numerique.gouv.fr/api/v4/channels`,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    }
  });

  const sleep = ms => new Promise(r => setTimeout(r, ms));

  // eslint-disable-next-line guard-for-in
  for (let i in channels.data) {
    console.log(channels.data[i]);
    await sleep(500);
    try {
      await axios({
        method: 'post',
        url: `https://discussion.conseiller-numerique.gouv.fr/api/v4/channels/${channels.data[i].id}/members`,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        data: {
          // TODO : remplacer USERID par l'utilisateur qui doit rejoindre les canaux
          'user_id': 'USERID'
        }
      });
    } catch (e) {
      console.log(e);
    }
  }

};

process();
