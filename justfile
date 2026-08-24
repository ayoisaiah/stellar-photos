chrome-prod:
    npm run chrome:prod

chrome-dev:
    npm run chrome:dev

firefox-dev:
    npm run firefox:dev

firefox-prod:
    npm run firefox:prod

typecheck:
    npm run typecheck

test:
    npm test

check: typecheck test
