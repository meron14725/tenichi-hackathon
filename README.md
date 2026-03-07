# tenichi-hackathon

天下一武道会(社内ハッカソン)開発用repo

FastAPI + PostgreSQL + OTP2 (OpenTripPlanner 2) によるスケジュール管理 API。

## 前提条件

- [Docker](https://www.docker.com/) および Docker Compose がインストール済みであること

## ローカル環境構築

### 1. 環境変数の設定

プロジェクトルートに `.env` ファイルを作成し、以下の環境変数を設定してください。
各値は管理者に確認してください。

```bash
cp .env.example .env
# .env を編集して各値を設定
```

| 変数名 | 説明 |
|--------|------|
| `JWT_SECRET` | JWT トークン署名用のシークレットキー |
| `WEATHERAPI_KEY` | WeatherAPI.com の API キー |
| `GEMINI_API_KEY` | Google Gemini API キー |

### 2. OTP2 グラフデータの配置

OTP2 の経路探索にはビルド済みグラフファイル (`graph.obj`, 約 709MB) が必要です。
管理者からファイルを取得し、以下に配置してください。

```bash
mkdir -p otp2/data
cp /path/to/graph.obj otp2/data/
```

### 3. 起動

```bash
# 初回（イメージビルド + 起動）
docker compose up --build

# 2回目以降
docker compose up
```

OTP2 のグラフ読み込みに 2〜3 分かかります。全サービスが起動するまでお待ちください。

### 4. DB マイグレーション

初回起動後、別ターミナルでマイグレーションを実行してください。

```bash
docker compose exec backend alembic upgrade head
```

### 5. 動作確認

```bash
# ヘルスチェック
curl http://localhost:8000/healthz
# => {"status":"ok"}

# OTP2 確認
curl http://localhost:8080/otp/
# => {"version":{"version":"2.7.0", ...}}
```

API ドキュメント（Swagger UI）: http://localhost:8000/docs

## サービス構成

| サービス | ポート | 説明 |
|----------|--------|------|
| backend | 8000 | FastAPI アプリケーション |
| db | 5432 | PostgreSQL 16 |
| otp2 | 8080 | OpenTripPlanner 2 (経路探索) |

## 停止

```bash
docker compose down

# DB データも含めて完全にリセットする場合
docker compose down -v
```
