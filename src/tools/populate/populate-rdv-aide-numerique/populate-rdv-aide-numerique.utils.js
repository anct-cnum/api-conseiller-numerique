#!/usr/bin/env node
'use strict';

const { ObjectId } = require('mongodb');

const isValidObjectId = id => {
  return ObjectId.isValid(id) && (String)(new ObjectId(id)) === id;
};

const check = urls => structure => {
  return urls.some(url => url.external_id === (String)(structure._id)) === false;
};

const getStructureIdsOldUrl = (urls, structures) => {
  return structures.filter(check(urls)).map(s => s._id);
};

module.exports = {
  isValidObjectId,
  getStructureIdsOldUrl
};
