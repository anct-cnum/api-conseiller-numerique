#!/bin/bash -l

cd ${APP_HOME}

echo "Creating structures' accounts : START\n"
node src/tools/metabase/index.js
echo "Creating structures' accounts : END\n"
