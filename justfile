APP := "stellar-photos"
SERVER := "server"
EXT := "extension"

test-server:
    @go test  -C {{ SERVER }} ./... --json -coverprofile=coverage.out -coverpkg .

build-server:
    @go build -C {{ SERVER }} -o bin/{{ APP }} ./cmd...

dev-server:
    cd {{ SERVER }} && docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d --build

kill-server:
    cd {{ SERVER }} && docker compose down

server-logs:
    cd {{ SERVER }} && docker compose logs --follow

chrome-prod:
    cd {{ EXT }} && npm run chrome:prod

chrome-dev:
    cd {{ EXT }} && npm run chrome:dev

firefox-dev:
    cd {{ EXT }} && npm run firefox:dev

firefox-prod:
    cd {{ EXT }} && npm run firefox:prod

test-ext:
    cd {{ EXT }} && npm run test
