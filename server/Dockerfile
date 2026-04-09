# ── Build stage ──────────────────────────────────────────────────────────────
FROM golang:1.21-alpine AS builder
WORKDIR /app

# Install build deps
RUN apk add --no-cache git

COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o certychain-server .

# ── Runtime stage ─────────────────────────────────────────────────────────────
FROM alpine:3.19
RUN apk --no-cache add ca-certificates tzdata
WORKDIR /root/

COPY --from=builder /app/certychain-server .

EXPOSE 8080

CMD ["./certychain-server"]
