# 結合テスト: OTP2 + FastAPI + DB (docker-compose)

## 背景

Phase 8 (経路API) まで実装完了したが、OTP2サーバーとの実際の結合テストが未実施だった。
Phase 9 に進む前に、docker-compose で3サービスを起動し Routes API がエンドツーエンドで動作することを確認した。

## 作業内容

### 修正箇所

1. **`otp2/Dockerfile`** — OTP2 JAR の取得先を修正
   - Maven Central → GitHub Releases (`otp-shaded-2.7.0.jar`)
   - Maven Central にはファイル名が異なる形式しか存在しなかった

2. **`docker-compose.yml`** — OTP2 ヘルスチェック修正
   - エンドポイント: `/otp/actuators/health` (404) → `/otp/` (200)
   - `start_period`: 120s → 180s (グラフロードに時間がかかるため)
   - `retries`: 5 → 10

3. **`backend/app/services/otp2_client.py`** — GraphQL クエリ修正
   - `dateTime: { earliestDeparture: "now" }` → dateTime 引数省略 (OTP2 v2.7.0 では `"now"` が CoercingSerializeException を発生させる)

4. **`.env`** — プロジェクトルートに作成 (docker-compose 環境変数警告の解消)

## テスト結果

### サービス起動確認
- `docker compose up --build` → 3サービス (backend, db, otp2) すべて healthy

### API 動作確認

**Routes API** (`POST /api/v1/routes/search`)
- 東京駅 (35.6812, 139.7671) → 渋谷 (35.6595, 139.7006) の transit 経路検索
- 山手線、銀座線、半蔵門線、中央線快速 など複数ルートを正常に取得

**Departure Time API** (`POST /api/v1/routes/departure-time`)
- 自宅 → 渋谷、到着時刻指定での出発時刻計算を正常に取得
