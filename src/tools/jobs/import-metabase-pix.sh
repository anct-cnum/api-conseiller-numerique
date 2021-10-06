#!/bin/bash -l

cd ${APP_HOME}

echo "Import Metabase PIX: START\n"
node src/tools/imports/metabase.js
echo "Import Metabase PIX: END\n"
