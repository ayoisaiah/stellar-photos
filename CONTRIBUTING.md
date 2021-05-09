# Contribution guidelines

Hello! Thanks for your interest in contributing to Stellar Photos. Before you open a pull request, please create an issue so that it may be determined if the change is consistent with the goals of the project.

## Build instructions

Make sure you have [yarn](https://yarnpkg.com/en/docs/install) installed.

```bash
$ git clone https://github.com/ayoisaiah/stellar-photos
$ cd stellar-photos
$ yarn # install dependencies
# Option 1. Chrome development build
$ yarn run build:chrome:dev
# Option 2. Chrome production build
$ yarn run build:chrome:prod
# Option 3. Firefox development build
$ yarn run build:firefox:dev
# Option 4. Firefox production build
$ yarn run build:firefox:prod
```

Grab the [server code here](https://github.com/ayoisaiah/stellar-photos-server) (written in Go) and follow the instructions in the README to build and run it.
