# Contribution guidelines

Hello! Thanks for your interest in contributing to Stellar Photos. Before you open a pull request, please create an issue so that it may be determined if the change is consistent with the goals of the project.

## Build instructions

Install a current Node.js release and npm. Create an Unsplash application and
export its access key for local builds.

```bash
$ git clone https://github.com/ayoisaiah/stellar-photos
$ cd stellar-photos
$ npm install
$ export UNSPLASH_ACCESS_KEY=your-access-key
$ npm run typecheck
$ npm test
$ npm run chrome:prod
$ npm run firefox:prod
```

Load `dist/chrome` in Chrome/Chromium or `dist/firefox` in Firefox as an
unpacked/temporary extension. Verify a fresh tab, repeated tabs, cached offline
loading, and several rapidly opened tabs. Network requests are mocked in tests;
the unpacked smoke test uses your configured Unsplash application.
