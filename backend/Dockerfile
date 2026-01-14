# FANUC Backend Dockerfile（Go / Gin）

FROM golang:1.21-alpine AS builder

WORKDIR /src

RUN apk add --no-cache git ca-certificates tzdata

COPY go.mod go.sum ./
RUN go mod download

COPY . .

RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -o /out/server .

FROM alpine:3.19 AS runner

WORKDIR /app
RUN apk add --no-cache ca-certificates tzdata

COPY --from=builder /out/server /app/server

# 上传目录（建议用 volume 挂载）
RUN mkdir -p /app/uploads

EXPOSE 8080

ENV HOST=0.0.0.0
ENV PORT=8080

CMD ["/app/server"]

