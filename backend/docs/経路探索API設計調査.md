# 経路探索API設計調査

> **目的:** Phase 7（Routes 実装）のブロッカー解消のため、OTP2 を使った経路探索 API の入出力設計を整理する。
> **作成日:** 2026-03-01

---

## 1. 概要

バックエンドは BFF（Backend For Frontend）として OTP2（OpenTripPlanner 2）をラップし、フロントエンドに2つのエンドポイントを提供する。

| エンドポイント | 機能 |
|---------------|------|
| `POST /routes/search` | 経路検索。出発地・目的地・移動手段（・到着希望時刻）を受け取り、乗換案内付きの経路を返す |
| `POST /routes/departure-time` | 出発時刻逆算。目的地と到着時刻を受け取り、「いつ家を出ればよいか（`leave_home_at`）」と「いつ身支度を始めればよいか（`start_preparation_at`）」を返す |

OTP2 は Java ベースのオープンソース（LGPL）マルチモーダル経路探索エンジン。GraphQL API のみ提供（REST API は v2 で廃止）。

---

## 2. ユーザー仮説の検証

> **仮説:** 「出発地点の緯度経度、目的地の緯度経度、到着時間があれば出発時刻が出せる」

**仮説は正しい。かつ OTP2 が全区間を自動計算してくれる。**

OTP2 の `planConnection(dateTime: { latestArrival: "..." })` に3つの情報を渡すだけで、

1. 出発地 → 最寄り駅（徒歩）
2. 最寄り駅 → 目的地最寄り駅（電車）
3. 駅 → 目的地（徒歩）

の全区間を考慮した最適出発時刻が `itinerary.start` に返ってくる。

`itinerary.start` がそのまま「家を出る時刻（`leave_home_at`）」となる（OTP2 の origin に自宅座標を渡しているため、徒歩区間を含む全行程の出発点 = 家を出る時刻）。

さらにサーバーサイドで `UserSettings.preparation_minutes` を引くことで「身支度を始める時刻（`start_preparation_at`）」を算出できる。

---

## 3. 必要な入力情報の整理

### 3.1 `POST /routes/search` — リクエストパラメータ

| パラメータ | 型 | 必須 | 取得元 | 説明 |
|-----------|----|----|--------|------|
| `origin_lat` | `float` | ○ | リクエスト or UserSettings | 出発地の緯度 |
| `origin_lon` | `float` | ○ | リクエスト or UserSettings | 出発地の経度 |
| `destination_lat` | `float` | ○ | リクエスト（Schedule から引き継ぎ） | 目的地の緯度 |
| `destination_lon` | `float` | ○ | リクエスト（Schedule から引き継ぎ） | 目的地の経度 |
| `travel_mode` | `string` | ○ | リクエスト（Schedule から引き継ぎ） | `transit` / `walking` / `cycling` / `driving`。詳細は § 8.3 参照 |
| `arrival_time` | `string` | 任意 | リクエスト | 到着希望時刻（ISO 8601 JST）。省略時は現在時刻出発で最速経路を返す |

> **UserSettings から自動補完できる項目:**
> - `origin_lat` / `origin_lon` — リクエストに含まれない場合、認証済みユーザーの `UserSettings.home_lat` / `home_lon` を使用する

### 3.2 `POST /routes/departure-time` — リクエストパラメータ

| パラメータ | 型 | 必須 | 取得元 | 説明 |
|-----------|----|----|--------|------|
| `destination_lat` | `float` | ○ | リクエスト（Schedule から引き継ぎ） | 目的地の緯度 |
| `destination_lon` | `float` | ○ | リクエスト（Schedule から引き継ぎ） | 目的地の経度 |
| `arrival_time` | `string` | ○ | リクエスト（Schedule.start_at） | 到着希望時刻（ISO 8601 JST） |
| `travel_mode` | `string` | ○ | リクエスト（Schedule から引き継ぎ） | `transit` / `walking` / `cycling` / `driving`。詳細は § 8.3 参照 |

> **UserSettings から自動取得される項目（リクエスト不要）:**
> - `origin_lat` / `origin_lon` — `UserSettings.home_lat` / `home_lon` をサーバーが自動取得
> - `preparation_minutes` — `UserSettings.preparation_minutes` をサーバーが自動取得し `leave_home_at` 計算に使用

---

## 4. OTP2 GraphQL クエリ設計

`planConnection` + `latestArrival` の組み合わせが OTP2 v2.7.0 以降の推奨形式。

### 4.1 到着時刻指定（逆方向探索）クエリ

```graphql
query DepartureTimeSearch(
  $originLat: Float!
  $originLon: Float!
  $destLat: Float!
  $destLon: Float!
  $latestArrival: OffsetDateTime!
) {
  planConnection(
    origin: {
      location: { coordinate: { latitude: $originLat, longitude: $originLon } }
    }
    destination: {
      location: { coordinate: { latitude: $destLat, longitude: $destLon } }
    }
    dateTime: { latestArrival: $latestArrival }
    modes: {
      transit: { transit: [{ mode: RAIL }, { mode: SUBWAY }, { mode: BUS }] }
      direct: [WALK]
    }
    first: 5
  ) {
    edges {
      node {
        start    # 出発すべき時刻（これが departure_time の答え）
        end      # 到着時刻
        duration
        numberOfTransfers
        legs {
          mode
          route {
            shortName
            longName
            agency { name }
          }
          from {
            name
            stop { gtfsId }
          }
          to {
            name
            stop { gtfsId }
          }
          start { scheduledTime }
          end   { scheduledTime }
          headsign
          interlineWithPreviousLeg
          stopCalls {
            stopLocation {
              ... on Stop {
                name
                gtfsId
              }
            }
            schedule {
              scheduledDeparture
              scheduledArrival
            }
          }
        }
      }
    }
  }
}
```

### 4.2 出発時刻指定（通常探索）クエリ

```graphql
query RouteSearch(
  $originLat: Float!
  $originLon: Float!
  $destLat: Float!
  $destLon: Float!
  $earliestDeparture: OffsetDateTime!
) {
  planConnection(
    origin: {
      location: { coordinate: { latitude: $originLat, longitude: $originLon } }
    }
    destination: {
      location: { coordinate: { latitude: $destLat, longitude: $destLon } }
    }
    dateTime: { earliestDeparture: $earliestDeparture }
    modes: {
      transit: { transit: [{ mode: RAIL }, { mode: SUBWAY }, { mode: BUS }] }
      direct: [WALK]
    }
    first: 5
  ) {
    edges {
      node {
        start
        end
        duration
        numberOfTransfers
        legs {
          mode
          route {
            shortName
            longName
            agency { name }
          }
          from { name }
          to   { name }
          start { scheduledTime }
          end   { scheduledTime }
          headsign
          interlineWithPreviousLeg
        }
      }
    }
  }
}
```

### 4.3 直接移動モード（walking / cycling / driving）クエリ

`transit` 以外のモードは乗り換えなしの直接移動（`direct` のみ）を使用する。

| travel_mode | OTP2 modes 構文 |
|-------------|----------------|
| `transit`   | `modes: { transit: { transit: [{ mode: RAIL }, { mode: SUBWAY }, { mode: BUS }] }, direct: [WALK] }` |
| `walking`   | `modes: { direct: [WALK] }` |
| `cycling`   | `modes: { direct: [BICYCLE] }` |
| `driving`   | `modes: { direct: [CAR] }` |

```graphql
query DirectModeSearch(
  $originLat: Float!
  $originLon: Float!
  $destLat: Float!
  $destLon: Float!
  $earliestDeparture: OffsetDateTime!
  $mode: DirectMode!   # WALK / BICYCLE / CAR
) {
  planConnection(
    origin: { location: { coordinate: { latitude: $originLat, longitude: $originLon } } }
    destination: { location: { coordinate: { latitude: $destLat, longitude: $destLon } } }
    dateTime: { earliestDeparture: $earliestDeparture }
    modes: { direct: [$mode] }
    first: 1   # 直接移動は 1件のみ
  ) {
    edges {
      node {
        start
        end
        duration
        legs {
          mode
          from { name }
          to   { name }
          start { scheduledTime }
          end   { scheduledTime }
        }
      }
    }
  }
}
```

逆方向探索（`departure-time`）の場合は `dateTime: { latestArrival: $latestArrival }` に変更。

---

## 5. バックエンドAPIエンドポイント設計

### 5.1 `POST /routes/search` — 経路検索

**リクエスト**

```jsonc
{
  "origin_lat": 35.6895,          // 省略時は UserSettings.home_lat を使用
  "origin_lon": 139.6917,         // 省略時は UserSettings.home_lon を使用
  "destination_lat": 35.6580,
  "destination_lon": 139.7016,
  "travel_mode": "transit",
  "arrival_time": "2026-03-10T19:00:00+09:00"  // 任意。省略時は現在時刻出発
}
```

**レスポンス `200 OK`**

```jsonc
{
  "itineraries": [
    {
      "departure_time": "2026-03-10T18:12:00+09:00",
      "arrival_time": "2026-03-10T18:58:00+09:00",
      "duration_minutes": 46,
      "number_of_transfers": 1,
      "legs": [
        {
          "mode": "WALK",
          "from_name": "出発地",
          "to_name": "高円寺駅",
          "departure_time": "2026-03-10T18:12:00+09:00",
          "arrival_time": "2026-03-10T18:20:00+09:00",
          "duration_minutes": 8
        },
        {
          "mode": "RAIL",
          "route_short_name": "中央線（快速）",
          "route_long_name": "中央本線",
          "agency_name": "JR東日本",
          "headsign": "東京方面",
          "from_name": "高円寺駅",
          "to_name": "新宿駅",
          "departure_time": "2026-03-10T18:23:00+09:00",
          "arrival_time": "2026-03-10T18:29:00+09:00",
          "duration_minutes": 6
        },
        {
          "mode": "RAIL",
          "route_short_name": "山手線",
          "route_long_name": "山手線",
          "agency_name": "JR東日本",
          "headsign": "渋谷・品川方面",
          "from_name": "新宿駅",
          "to_name": "渋谷駅",
          "departure_time": "2026-03-10T18:33:00+09:00",
          "arrival_time": "2026-03-10T18:38:00+09:00",
          "duration_minutes": 5
        },
        {
          "mode": "WALK",
          "from_name": "渋谷駅",
          "to_name": "目的地",
          "departure_time": "2026-03-10T18:38:00+09:00",
          "arrival_time": "2026-03-10T18:58:00+09:00",
          "duration_minutes": 20
        }
      ]
    }
  ]
}
```

**`walking` レスポンス例**（legs は1件、transit 専用フィールドなし）：

```jsonc
{
  "itineraries": [
    {
      "departure_time": "2026-03-10T18:12:00+09:00",
      "arrival_time": "2026-03-10T18:40:00+09:00",
      "duration_minutes": 28,
      // number_of_transfers は walking/cycling/driving では返却しない
      "legs": [
        {
          "mode": "WALK",
          "from_name": "出発地",
          "to_name": "目的地",
          "departure_time": "2026-03-10T18:12:00+09:00",
          "arrival_time": "2026-03-10T18:40:00+09:00",
          "duration_minutes": 28
          // route_short_name / agency_name / headsign なし
        }
      ]
    }
  ]
}
```

`cycling` は `mode: "BICYCLE"`、`driving` は `mode: "CAR"` で同形式。

---

### 5.2 `POST /routes/departure-time` — 出発時刻逆算

**リクエスト**

```jsonc
{
  "destination_lat": 35.6580,
  "destination_lon": 139.7016,
  "arrival_time": "2026-03-10T19:00:00+09:00",
  "travel_mode": "transit"
  // origin_lat / origin_lon は UserSettings.home_lat / home_lon を自動取得
  // preparation_minutes は UserSettings.preparation_minutes を自動取得
}
```

**レスポンス `200 OK`**

```jsonc
{
  "leave_home_at": "2026-03-10T18:12:00+09:00",         // OTP2 が算出した家を出る時刻（itinerary.start）
  "start_preparation_at": "2026-03-10T17:42:00+09:00",   // leave_home_at - preparation_minutes（身支度を始める時刻）
  "preparation_minutes": 30,                               // UserSettings から取得した値（確認用）
  "arrival_time": "2026-03-10T19:00:00+09:00",            // リクエストで指定した到着時刻
  "itinerary": {
    "duration_minutes": 48,
    "number_of_transfers": 1,
    "legs": [
      {
        "mode": "WALK",
        "from_name": "自宅付近",
        "to_name": "高円寺駅",
        "departure_time": "2026-03-10T18:12:00+09:00",
        "arrival_time": "2026-03-10T18:20:00+09:00",
        "duration_minutes": 8
      },
      {
        "mode": "RAIL",
        "route_short_name": "中央線（快速）",
        "headsign": "東京方面",
        "from_name": "高円寺駅",
        "to_name": "新宿駅",
        "departure_time": "2026-03-10T18:23:00+09:00",
        "arrival_time": "2026-03-10T18:29:00+09:00",
        "duration_minutes": 6
      }
    ]
  }
}
```

---

## 6. 出発時刻逆算の仕組み

OTP2 は `latestArrival` を指定することで**逆方向探索（Reverse Search）**を行う。

通常の探索（`earliestDeparture`）が「出発時刻から最短の到着時刻を求める」のに対し、
逆方向探索は「到着希望時刻から最遅の出発時刻を求める」。

```
通常:  出発時刻 → [OTP2探索] → 最速到着時刻
逆算:  到着希望時刻 ← [OTP2逆方向探索] ← 最遅出発時刻
```

OTP2 が内部で以下を考慮して出発時刻を算出する：
- 自宅 → 最寄り駅までの徒歩時間
- 最寄り駅での電車待ち時間（時刻表ベース）
- 乗車時間・乗り換え時間
- 降車駅 → 目的地までの徒歩時間

返却された `itinerary.start` の値が `leave_home_at`（家を出る時刻）となる。
OTP2 の origin に自宅座標（`home_lat/home_lon`）を渡しているため、出発地点から徒歩区間を含む全行程の先頭時刻 = 家を出る時刻になる。

---

## 7. 身支度時間の計算

`leave_home_at`（OTP2 が算出した家を出る時刻）から `UserSettings.preparation_minutes` を引くことで「身支度を始める時刻（`start_preparation_at`）」を算出する。

```
leave_home_at       = itinerary.start（OTP2 算出）
start_preparation_at = leave_home_at - preparation_minutes（分）
```

**実装例（Python）:**

```python
from datetime import timedelta

leave_home_at = itinerary["start"]  # OTP2 の応答から取得（= 家を出る時刻）
preparation_minutes = user_settings.preparation_minutes  # UserSettings から取得

start_preparation_at = leave_home_at - timedelta(minutes=preparation_minutes)
```

**具体例:**

| 項目 | 値 |
|------|-----|
| 到着希望時刻（`arrival_time`） | `2026-03-10T19:00:00+09:00` |
| OTP2 算出の家を出る時刻（`leave_home_at`） | `2026-03-10T18:12:00+09:00` |
| 身支度時間（`preparation_minutes`） | 30 分 |
| 身支度を始める時刻（`start_preparation_at`） | `2026-03-10T17:42:00+09:00` |

---

## 8. 実装上の注意点・制約

### 8.1 GTFS 有効期限切れ問題

現在 `learn-OpenTripPlanner/data/GTFS-data/` に生成済みの GTFS データは `end_date` が `2025-12-31` となっており**有効期限切れ**（現在 2026-03-01）。

OTP2 は有効期限外の日付で経路検索を行うと結果を返さない。

**対応方針:**
1. TrainGTFSGenerator の設定で `end_date` を `2026-12-31` 以降に変更する
2. `poetry run python src/main.py` を再実行して GTFS を再生成する
3. 再生成後にグラフビルドを再実行する（`java -Xmx4G -jar otp.jar --build --save data/`）

### 8.2 対応路線の範囲

TrainGTFSGenerator で対応している**首都圏 22 事業者**のみ経路検索可能。

| 事業者グループ | 主な路線 |
|---------------|---------|
| JR東日本 | 山手線・中央線・京浜東北線など 49 路線 |
| 東京メトロ | 銀座線・丸ノ内線など 10 路線 |
| 都営 | 地下鉄・荒川線・日暮里舎人ライナーなど 6 路線 |
| 私鉄各社 | 東急・小田急・西武・東武・京急・京成・相鉄 等 |
| その他 | 横浜市営地下鉄・つくばエクスプレス・多摩モノレール・ゆりかもめ 等 |

**未対応路線（既知）:**
- ~~京王線（`Keio-Train.gtfs.zip` が未生成）~~ **→ 生成済み（488 KB、有効期限 2026-12-31）**

### 8.3 travel_mode の制約

全4値（walking / cycling / transit / driving）に対応。`transit` モードはバス（BUS）を含む公共交通機関（RAIL / SUBWAY / BUS）を使用する。

| `travel_mode` | 対応状況 | OTP2 direct/transit modes |
|--------------|---------|--------------------------|
| `transit`    | ✅ 対応  | `transit: [RAIL, SUBWAY, BUS], direct: [WALK]` |
| `walking`    | ✅ 対応  | `direct: [WALK]` |
| `cycling`    | ✅ 対応  | `direct: [BICYCLE]` |
| `driving`    | ✅ 対応  | `direct: [CAR]` |

各モードの legs フィールド差異：

| フィールド | transit | walking | cycling | driving |
|-----------|---------|---------|---------|---------|
| `mode` | WALK / RAIL / SUBWAY / BUS | WALK | BICYCLE | CAR |
| `route_short_name` | transit leg のみ | なし | なし | なし |
| `agency_name` | transit leg のみ | なし | なし | なし |
| `headsign` | transit leg のみ | なし | なし | なし |
| `number_of_transfers` | あり | なし | なし | なし |

4値以外の `travel_mode` でリクエストされた場合は `400 VALIDATION_ERROR` を返す。

### 8.4 環境変数

OTP2 のホスト先 URL は環境変数で管理する。

```
OTP2_GRAPHQL_URL=http://localhost:8080/otp/gtfs/v1
```

本番環境では Cloud Run 等でデプロイした OTP2 サーバーの URL を設定する。

### 8.5 タイムゾーン

すべての日時は **JST（+09:00）** で統一する。

- リクエスト: ISO 8601 形式（`2026-03-10T19:00:00+09:00`）
- OTP2 への送信: `OffsetDateTime` 形式（そのまま渡せる）
- レスポンス: ISO 8601 形式（+09:00 付き）

### 8.6 `UserSettings.home_lat` / `home_lon` が未設定の場合

`POST /routes/departure-time` は `UserSettings.home_lat` / `home_lon` を必須として使用する。
これらが `null` の場合はエラーを返す。

---

## 9. エラーコード一覧

| エラーコード | HTTP ステータス | 発生条件 |
|-------------|----------------|---------|
| `ROUTE_NOT_FOUND` | 404 | OTP2 が指定条件で経路を見つけられなかった（GTFS 期限切れ含む） |
| `OTP_UNAVAILABLE` | 503 | OTP2 サーバーへの接続に失敗した |
| `HOME_LOCATION_NOT_SET` | 400 | `UserSettings.home_lat` / `home_lon` が未設定（`departure-time` エンドポイントで発生） |
| `VALIDATION_ERROR` | 400 | `travel_mode` が 4値（transit/walking/cycling/driving）以外など |

**エラーレスポンス形式（共通形式に準拠）:**

```jsonc
{
  "error": {
    "code": "ROUTE_NOT_FOUND",
    "message": "指定した条件で経路が見つかりませんでした"
  }
}
```

---

## 10. 未解決事項（TODO）

| # | 事項 | 優先度 | 担当 |
|---|------|--------|------|
| T-1 | GTFS の有効期限修正・再生成（`end_date` を `2026-12-31` に変更して再実行） | ✅ 解消 | 全 GTFS が `end_date: 2026-12-31` で有効 |
| T-2 | OTP2 のデプロイ先決定（Cloud Run / GCE / その他） | 高 | **後回し** — Phase 7 実装直前に決定 |
| T-3 | 京王線 GTFS 未生成の対応方針（スコープ内/外の確認） | ✅ 解消 | `Keio-Train.gtfs.zip` は生成・対応済み |
| T-4 | transit 以外の travel_mode 対応方針 | ✅ 完了 | 全4値対応（§ 8.3 参照） |
| T-5 | OTP2 グラフビルド実行（セットアップ手順は `docs/api/外部経路探索API調査.md § 6` 参照） | ✅ 解消 | `graph.obj`（709 MB）ビルド済み |
| T-6 | 動作検証クエリの実行（「2026-03-10 に渋谷へ 19:00 着」で `leave_home_at` が正しく返るか） | 高 | **残存** — デプロイ先確定後に実施 |

---

## 11. 参考リンク

- [OTP2 公式ドキュメント](https://docs.opentripplanner.org/)
- [OTP2 GraphQL API リファレンス](https://docs.opentripplanner.org/api/dev-2.x/graphql-gtfs/)
- [planConnection クエリ](https://docs.opentripplanner.org/api/dev-2.x/graphql-gtfs/queries/planConnection)
- [OTP2 GitHub](https://github.com/opentripplanner/OpenTripPlanner)
- [TrainGTFSGenerator GitHub](https://github.com/fksms/TrainGTFSGenerator)

---

## 参考ドキュメント（相互リンク）

- `docs/api/外部経路探索API調査.md` — API 候補比較・OTP2 機能検証・GTFS 状況・セットアップ手順
- `../learn-OpenTripPlanner/OTP2-investigation-report.md` — GraphQL クエリサンプル・詳細検証結果
- `backend/docs/データモデル草案.md` — UserSettings（home_lat/lon, preparation_minutes）・Schedule のデータ定義
- `backend/docs/API詳細設計.md` — 既存エンドポイント設計（Routes は本ドキュメントで解消）
- `backend/app/api/api仕様.md` — Routes エンドポイント一覧
