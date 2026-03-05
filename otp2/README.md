# OTP2 (OpenTripPlanner 2) Server

## ビルド前の準備

`data/` ディレクトリに以下のファイルを配置してからDockerイメージをビルドしてください。

```
otp2/
├── Dockerfile
├── data/
│   └── graph.obj    ← OTP2のビルド済みグラフファイル（~709MB）
└── README.md
```

`graph.obj` は `learn-OpenTripPlanner/data/` から取得できます。

## Docker ビルド

```bash
# graph.obj を data/ にコピー
cp ../learn-OpenTripPlanner/data/graph.obj data/

# イメージビルド
docker build -t otp2-server .
```

## ローカル実行

```bash
docker run -p 8080:8080 otp2-server
```

GraphQL Playground: http://localhost:8080/graphiql
GraphQL Endpoint: http://localhost:8080/otp/gtfs/v1
