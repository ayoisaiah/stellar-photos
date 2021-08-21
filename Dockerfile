FROM golang:alpine AS multistage
# Set necessary environmental variables needed for the image
ENV GO111MODULE=on \
    CGO_ENABLED=0 \
    GOOS=linux \
    GOARCH=amd64

# Move to working directory /build
WORKDIR /build

# Copy and download dependency using go mod
COPY go.mod .
COPY go.sum .
RUN go mod download

# Copy the code into the container
COPY . .

# Build the application
RUN go build -o stellar-photos-server .

FROM alpine:latest AS stellar-prod
# Copy from binary multistage image
COPY --from=multistage /build/stellar-photos-server /go/bin

# Export necessary port
EXPOSE 8080

# Command to run when starting the container
CMD ["/go/bin/stellar-photos-server"]
