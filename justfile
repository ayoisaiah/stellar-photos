APP := "stellar-photos"
SERVER := "server"

test-server:
	@go test  -C {{SERVER}} ./... --json -coverprofile=coverage.out -coverpkg .

build-server:
	@go build -C {{SERVER}} -o bin/{{APP}} ./cmd...

run-server:
	@docker compose --project-directory {{SERVER}} -f docker-compose.yml -f docker-compose.dev.yml up -d

kill-server
	@docker compose --project-directory {{SERVER}} down

lint-server:
	@golangci-lint run ./{{SERVER}}/...

pre-commit:
	@pre-commit run

clean-server:
	@rm -r {{SERVER}}/bin
	@go clean

sloc:
	tokei
