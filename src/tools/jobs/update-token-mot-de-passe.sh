#!/bin/bash -l

cd ${APP_HOME}

echo "Désactivation du token du mot de passe oublié: START\n"
node src/tools/scripts/desactivationToken.js
echo "Désactivation du token du mot de passe oublié: END\n"
