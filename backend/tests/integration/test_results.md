# OTP2 + API 結合テスト結果レポート

> **実行日時:** 2026-03-10
> **実行環境:** Python 3.11.14, pytest 8.4.2, pytest-asyncio 0.25.3
> **OTP2 バージョン:** OpenTripPlanner v2.7.0
> **テストファイル:** `backend/tests/integration/test_otp2_routes.py`

---

## 1. サマリー

| 項目 | 値 |
|------|-----|
| テストケース数 | 14 |
| PASSED | 0 |
| FAILED | 0 |
| SKIPPED | 14 |
| ERROR | 0 |
| 実行時間 | 0.02s |
| スキップ理由 | PostgreSQL / OTP2 が未起動 |

**注意:** 本テスト環境では Docker デーモンが起動しておらず、PostgreSQL (port 5432) および OTP2 (port 8080) の両方が利用できないため、全テストが自動スキップされました。テストコード自体の構文・インポートは正常に動作しています。

---

## 2. テストケース一覧と詳細

### 2.1 経路検索 (`POST /api/v1/routes/search`) — 8 ケース

| # | テスト名 | 結果 | 説明 |
|---|---------|------|------|
| TC-01 | `test_search_transit` | SKIPPED | 新宿→東京駅の transit 検索。itineraries が非空で RAIL/SUBWAY/BUS leg を含むことを検証 |
| TC-02 | `test_search_walking` | SKIPPED | 新宿→渋谷の walking 検索。1件の itinerary で全 leg が WALK モードであることを検証 |
| TC-03 | `test_search_cycling` | SKIPPED | 新宿→六本木の cycling 検索。1件の itinerary で全 leg が BICYCLE モードであることを検証 |
| TC-04 | `test_search_driving` | SKIPPED | 高円寺→東京駅の driving 検索。1件の itinerary で全 leg が CAR モードであることを検証 |
| TC-05 | `test_search_with_arrival_time` | SKIPPED | arrival_time 指定（+2h）での transit 検索。itineraries が返却されることを検証 |
| TC-06 | `test_search_home_fallback` | SKIPPED | origin 省略時に UserSettings.home_lat/lon がフォールバック使用されることを検証 |
| TC-07 | `test_search_response_structure` | SKIPPED | transit 検索レスポンスの全フィールド存在・型・不変条件（departure < arrival）を検証 |
| TC-08 | `test_search_transit_multiple_results` | SKIPPED | transit 検索が複数の経路候補（>= 2件）を返すことを検証 |

### 2.2 出発時刻逆算 (`POST /api/v1/routes/departure-time`) — 4 ケース

| # | テスト名 | 結果 | 説明 |
|---|---------|------|------|
| TC-09 | `test_departure_time_transit` | SKIPPED | transit 出発時刻逆算。leave_home_at / start_preparation_at / preparation_minutes=30 を検証 |
| TC-10 | `test_departure_time_preparation_math` | SKIPPED | leave_home_at - start_preparation_at == 30分（身支度時間）の計算正確性を検証 |
| TC-11 | `test_departure_time_walking` | SKIPPED | walking 出発時刻逆算。有効なレスポンスが返ることを検証 |
| TC-12 | `test_departure_time_leave_before_arrival` | SKIPPED | leave_home_at < arrival_time の不変条件を検証 |

### 2.3 エラーケース — 2 ケース

| # | テスト名 | 結果 | 説明 |
|---|---------|------|------|
| TC-13 | `test_search_invalid_coordinates` | SKIPPED | GTFS 範囲外座標 (0, 0) で 404 ROUTE_NOT_FOUND または 503 が返ることを検証 |
| TC-14 | `test_search_same_origin_destination` | SKIPPED | 同一地点の出発・到着で 200 または 404 が返ることを検証（動作確認） |

---

## 3. テスト設計方針

### 3.1 モック不使用

既存の `test_api_routes.py` が `otp2_client.search_routes` をモックしているのに対し、本結合テストは **OTP2 GraphQL サーバーへの実リクエスト** を行い、以下のフルスタックを検証する:

```
API Endpoint → routes_service → otp2_client → OTP2 (GraphQL) → レスポンス変換
```

### 3.2 構造的アサーション

OTP2 はリアルタイムの時刻表データに基づくため、正確な値ではなく **不変条件** を検証する:

- フィールド存在チェック（departure_time, arrival_time, duration_minutes, legs 等）
- 型チェック（ISO 8601 datetime パース可能性）
- 不変条件: `departure_time < arrival_time`, `duration_minutes > 0`
- モード整合性: transit → RAIL/SUBWAY/BUS leg、walking → WALK leg
- 件数制約: transit → 1-5件、非transit → 1件

### 3.3 スキップ制御

`pytest_collection_modifyitems` フックにより、テスト収集段階で PostgreSQL / OTP2 の可用性を確認。未起動時は fixture セットアップに入る前に全テストをスキップし、クリーンな出力を保証する。

---

## 4. 検証ポイントの API 仕様との対応

| API 仕様要件 | テストケース | 検証方法 |
|-------------|------------|---------|
| transit 検索で itineraries 返却 | TC-01, TC-08 | len(itineraries) >= 1, >= 2 |
| 4種の travel_mode 対応 | TC-01〜04 | 各モードで 200 + 正しい leg mode |
| arrival_time 指定（逆算検索） | TC-05, TC-09 | latestArrival 経由で経路返却 |
| origin 省略時の home フォールバック | TC-06 | origin 未指定で 200 返却 |
| レスポンス構造の仕様準拠 | TC-07 | ItineraryResponse / LegResponse 全フィールド検証 |
| leave_home_at 算出 | TC-09, TC-12 | フィールド存在 + leave < arrival |
| preparation_minutes 計算 | TC-10 | leave - start_prep == 30分 |
| GTFS 範囲外で ROUTE_NOT_FOUND | TC-13 | status_code 404 or 503 |
| エッジケース（同一地点） | TC-14 | 200 or 404（動作記録） |

---

## 5. 実行方法

### 前提条件

```bash
# Docker services を起動
docker compose up -d

# OTP2 の起動を待つ（graph.obj ロードに約3分）
until curl -sf http://localhost:8080/otp/; do echo "Waiting for OTP2..."; sleep 10; done
```

### テスト実行

```bash
cd backend

# 結合テストのみ実行
python -m pytest tests/integration/ -v -m integration

# 全テスト（結合テストは OTP2 未起動時に自動スキップ）
python -m pytest -v

# 結合テストを除外
python -m pytest -v -m "not integration"
```

---

## 6. 座標定数一覧

テストで使用する座標（全て GTFS カバー範囲内）:

| 名称 | 緯度 | 経度 | 用途 |
|------|------|------|------|
| 新宿駅 | 35.6896 | 139.7006 | transit / walking / cycling の出発地 |
| 東京駅 | 35.6812 | 139.7671 | transit / driving の目的地 |
| 渋谷駅 | 35.6580 | 139.7016 | walking の目的地 |
| 高円寺 | 35.7057 | 139.6496 | driving の出発地 |
| 六本木 | 35.6627 | 139.7311 | cycling の目的地 |

---

## 7. 今後の改善案

1. **CI/CD パイプラインへの組み込み**: Docker Compose で OTP2 + PostgreSQL を起動してから結合テストを実行するステージを追加
2. **パフォーマンステスト**: OTP2 GraphQL クエリのレスポンスタイム計測（目標: < 5秒）
3. **GTFS 有効期限の自動検知**: GTFS end_date を取得し、有効期限切れ前にアラートするテストを追加
4. **負荷テスト**: 並行リクエストでの OTP2 スループット検証
