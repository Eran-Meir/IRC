# ---------------------------------------------------------
# Stage 1: Build the Go binary
# ---------------------------------------------------------
FROM golang:1.21-alpine AS builder

WORKDIR /app

# Copy the go.mod first
COPY go.mod ./
RUN go mod tidy
RUN go mod download

# Copy the actual source code
COPY . .

# Build the binary specifically for Linux (statically linked)
# CGO_ENABLED=0 guarantees there are no C-library dependencies
RUN CGO_ENABLED=0 GOOS=linux go build -o ircd ./cmd/ircd/main.go

# ---------------------------------------------------------
# Stage 2: The final "Scratch" image (Zero OS overhead)
# ---------------------------------------------------------
FROM scratch

# Copy only the compiled binary from the builder stage
COPY --from=builder /app/ircd /ircd

# Expose the standard IRC port
EXPOSE 6667

# Run the binary
ENTRYPOINT ["/ircd"]
