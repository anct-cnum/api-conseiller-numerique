#!/usr/bin/env node
'use strict';

const { Pool } = require('pg');
const { program } = require('commander');

require('dotenv').config();

const { execute } = require('./utils');

execute(async ({ exit }) => {

  program.option('-t, --table <table>', 'table');
  program.parse(process.argv);

  const table = program.table;

  if (!['coach', 'hostorganization'].includes(table)) {
    exit('Paramètre invalide');
  }

  const pool = new Pool();

  const prefix = table === 'hostorganization' ? 'contact_' : '';

  const { rows } = await pool.query(`select lower(${prefix}email) as email, lower(${prefix}last_name) as ln, lower(${prefix}first_name) as fn, count(lower(${prefix}email)) as count \
  from djapp_${table} \
  group by email, ln, fn\
  having count(lower(${prefix}email)) > 1`);

  if (rows.length > 0) {
    console.log(`${rows.length} Doublons`);
    for (const row of rows) {
      const prefixMatching = table === 'hostorganization' ? 'host' : 'coach';
      const select = `select id from djapp_${table} where ${prefix}email = '${row.email}' order by id ASC limit ${row.count - 1}`;
      await pool.query(`delete from djapp_matching where ${prefixMatching}_id in (${select})`);
      await pool.query(`delete from djapp_${table} where id in (${select})`);
    }
  }
});
