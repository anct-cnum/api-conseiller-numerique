#!/bin/bash -l

cd ${APP_HOME}

echo "Suppression des CV vieux de plus de six mois: START\n"
node src/tools/scripts/suppressionCvSixMois.js
echo "Suppression des CV vieux de plus de six mois: END\n"
