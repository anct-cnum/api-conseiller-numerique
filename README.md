# api-conseiller-numerique

## About

This project uses [Feathers](http://feathersjs.com). An open source web framework for building modern real-time applications.

## Getting Started

### Base de données mongo

#### Avec Docker

Créer un volume qui sera persistant après l'extinction du conteneur, il est possible de créer plusieurs volumes pour gérer différents environnements :

```shell
docker volume create mongo.recette-conseiller-numerique
docker volume create mongo.production-conseiller-numerique
```

Télécharger et lancer l'image de mongo :

```shell
docker run -d --rm --name=mongo.recette-conseiller-numerique -p 27017:27017 -v mongo.recette-conseiller-numerique:/data/db mongo
```

Se connecter au conteneur pour exécuter l'export d'une base existante avec `mongodump`, exemple avec une chaîne de connexion clever-cloud, il faut remplacer `user`, `password` et `database` par les informations correspondantes :

```shell
docker exec mongo.recette-conseiller-numerique mongodump --uri="mongodb://${USER}:${PASSWORD}@${DATABASE}-mongodb.services.clever-cloud.com:2167/${DATABASE}"
```

Se connecter au conteneur pour exécuter l'import de la base avec `mongorestore` :

```shell
docker exec mongo.recette-conseiller-numerique mongorestore --drop --nsInclude='${DATABASE}.*' --nsFrom='${DATABASE}.*' --nsTo='conseiller-numerique.*'
```

Une fois l'import effectué, les données exportées peuvent être supprimées du conteneur de cette manière :

```shell
docker exec mongo.recette-conseiller-numerique rm -rf dump
```

Pour se connecter au conteneur afin de visualiser les bases de données avec `mongo` :

```shell
docker exec -it mongo.recette-conseiller-numerique mongo
```

Pour mettre fin à l'instance du conteneur :

```shell
docker stop mongo.recette-conseiller-numerique
```

Pour supprimer définitivement les données de la base :

```shell
docker volume rm mongo.recette-conseiller-numerique
```

### Base de données postgres (optionnel)

#### Avec Docker

Créer un dossier pour le fichier `pgsql` à importer.

```shell
mkdir /tmp/docker-import
```

Télécharger un export de la base de données au format `pgsql` depuis Scalingo dans le dossier `/tmp/import`

Créer un volume qui sera persistant après l'extinction du conteneur :

```shell
docker volume create postgres.conseiller-numerique
```

Télécharger et lancer l'image de postgres + l'extension postgis avec les informations d'identifications de votre choix :

```shell
docker run -d --rm --name=postgres-conseiller-numerique -p 5432:5432 -v postgres.conseiller-numerique:/var/lib/postgresql/data -v /tmp/import:/var/lib/postgresql/import -e POSTGRES_PASSWORD=pwd -e POSTGRES_USER=usr -e POSTGRES_DB=conseiller-numerique postgis/postgis
```

Se connecter au conteneur pour exécuter l'import de la base :

```shell
docker exec -it postgres-conseiller-numerique sh
```

Lorsque l'on lance le conteneur avec l'image `postgis` une base de donnée configurée avec postgis est créée, il faut la supprimer pour éviter les conflits lors de l'import :

```shell
dropdb -U usr conseiller-numerique
```

Puis recréer une base de donnée vide prête à recevoir les données de l'import :

```shell
createdb -U usr conseiller-numerique
```

Exécuter la commande pour importer le fichier `dump.pgsql` :

```shell
pg_restore --clean --if-exists --no-owner --no-privileges --no-comments -U usr -d conseiller-numerique /var/lib/postgresql/import/dump.pgsql
```

Puis quitter le terminal du conteneur :

```shell
exit
```

Pour mettre fin à l'instance du conteneur :

```shell
docker stop postgres-conseiller-numerique
```

Pour supprimer définitivement les données de la base :

```shell
docker volume rm postgres.conseiller-numerique
```

### API

Getting up and running is as easy as 1, 2, 3.

1. Make sure you have [NodeJS](https://nodejs.org/) and [npm](https://www.npmjs.com/) installed.
2. Install your dependencies

    ```bash
    cd path/to/api-conseiller-numerique
    npm install
    ```

3. Start your app

    ```bash
    npm start
    ```

## Testing

Simply run `npm test` and all your tests in the `test/` directory will be run.

## Scaffolding

Feathers has a powerful command line interface. Here are a few things it can do:

```bash
npm install -g @feathersjs/cli          # Install Feathers CLI

feathers generate service               # Generate a new Service
feathers generate hook                  # Generate a new Hook
feathers help                           # Show all commands
```

## Help

For more information on all the things you can do with Feathers visit [docs.feathersjs.com](http://docs.feathersjs.com).
