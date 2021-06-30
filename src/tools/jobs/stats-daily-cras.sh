#!/bin/bash -l

cd ${APP_HOME}

echo "Stats daily CRAs: START\n"
node src/tools/cras/index.js
echo "Stats daily CRAs: END\n"
