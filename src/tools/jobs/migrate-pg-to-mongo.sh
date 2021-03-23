#!/bin/bash -l

cd ${APP_HOME}
node src/tools/scripts/migrate-pg-to-mongo.js

