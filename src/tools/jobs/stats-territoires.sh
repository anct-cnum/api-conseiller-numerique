#!/bin/bash -l

cd ${APP_HOME}

echo "Stats Territoires: START\n"
node src/tools/statistiquesTerritoires/index.js
echo "Stats Territoires: END\n"
