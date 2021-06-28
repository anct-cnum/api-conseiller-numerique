#!/bin/bash -l

cd ${APP_HOME}

echo "Stats daily Cras: START\n"
node src/tools/cras/index.js
echo "Stats daily Cras: END\n"
