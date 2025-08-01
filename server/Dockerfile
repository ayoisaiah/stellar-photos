FROM golang:1.24-alpine AS base

FROM base AS dev

RUN go install github.com/air-verse/air@latest

WORKDIR /stellar-photos

CMD ["air"]

FROM base AS builder

# Move to working directory /build
WORKDIR /build

# Copy and download dependency using go mod
COPY go.mod go.sum ./

COPY .env ./

RUN go mod download

# Copy the code into the container
COPY . ./

# Build the application
RUN go build -o stellar ./cmd/stellar...

FROM alpine:3.22.1 AS final

WORKDIR /app

# Copy binary from builder image
COPY --from=builder /build/stellar ./

COPY --from=builder /build/.env ./

# Export the necessary port
EXPOSE 8080

# Command to run when starting the container
CMD ["/app/stellar"]
