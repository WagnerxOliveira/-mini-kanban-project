# ── Estágio 1: Build ──────────────────────────────────────────────────────────
FROM golang:1.21-alpine AS builder

WORKDIR /app

# Copia apenas os arquivos Go do backend
COPY backend/go.mod ./
RUN go mod download

COPY backend/ .

# Compila o binário estático
RUN CGO_ENABLED=0 GOOS=linux go build -o server .

# ── Estágio 2: Imagem final mínima ────────────────────────────────────────────
FROM alpine:latest

RUN apk --no-cache add ca-certificates

WORKDIR /root/

COPY --from=builder /app/server .

EXPOSE 8080

CMD ["./server"]
