#!/bin/bash -l

cd ${APP_HOME}

echo "Creating datas metabase : START\n"
node src/tools/metabase/index.js
echo "Creating datas metabase : END\n"
