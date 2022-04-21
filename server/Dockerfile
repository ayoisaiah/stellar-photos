FROM golang:1.18-alpine AS builder

# Move to working directory /build
WORKDIR /build

# Copy and download dependency using go mod
COPY go.mod go.sum ./

RUN go mod download

# Copy the code into the container
COPY . ./

# Build the application
RUN go build -o stellar ./cmd/stellar...

FROM alpine:latest AS stellar-prod

WORKDIR /app

# Copy binary from builder image
COPY --from=builder /build/stellar ./

# Export the necessary port
EXPOSE 8080

# Command to run when starting the container
CMD ["/app/stellar"]
