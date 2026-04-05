# Estágio 1: Build do frontend React com Vite
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build
# O Vite coloca o output em ../static/dist (relativo ao frontend/)
# Isso resulta em /app/static/dist dentro do container

# Estágio 2: Build do backend Go
FROM golang:1.21-alpine AS backend-builder
WORKDIR /app
COPY backend/go.mod backend/go.sum* ./
RUN go mod download
COPY backend/ ./
RUN go build -o jogacraque .

# Estágio 3: Imagem de produção mínima
FROM alpine:latest
RUN apk add --no-cache ca-certificates
WORKDIR /app

# Copia o binário Go
COPY --from=backend-builder /app/jogacraque .

# Copia o build do React (gerado pelo Vite em /app/static/dist)
COPY --from=frontend-builder /app/static/dist ./static/dist

EXPOSE 8080
CMD ["./jogacraque"]
