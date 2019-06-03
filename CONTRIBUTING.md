# Contribution Guidelines

Hello! Thanks for your interest in contributing to Stellar Photos. Before you write any code (especially for new features), please create a GitHub issue so that we can determine if the feature is consistent with the goals of the extension.

## Build instructions

Make sure you have [yarn](https://yarnpkg.com/en/docs/install) installed.

```
git clone https://github.com/ayoisaiah/stellar-photos
cd stellar-photos
yarn install
# Option 1. Chrome development build
yarn run build:chrome:dev
# Option 2. Chrome production build
yarn run build:chrome:prod
# Option 3. Firefox development build
yarn run build:firefox:dev
# Option 4. Firefox production build
yarn run build:firefox:prod
```

Grab the [server code here](https://github.com/ayoisaiah/stellar-photos-server) and follow the instructions in the README to build and run it.
