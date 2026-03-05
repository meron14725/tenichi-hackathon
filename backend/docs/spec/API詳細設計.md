# API 詳細設計（リクエスト / レスポンス JSON）

> **このドキュメントについて**
> `backend/app/api/api仕様.md` はエンドポイント一覧として維持します。
> 各エンドポイントの具体的なリクエスト / レスポンス JSON 仕様は本ドキュメントで管理します。
>
> データモデルの詳細は `backend/docs/spec/データモデル.md` を参照してください。

---

## 共通仕様

### ベース URL

```
/api/v1
```

### 認証

要認証エンドポイントには以下のヘッダーを付与します。

```http
Authorization: Bearer <access_token>
```

`/auth/register` と `/auth/login` は認証不要です。

### 日時フォーマット

ISO 8601（JST offset 付き）を使用します。

```
2026-03-01T09:00:00+09:00
```

### レスポンス形式

- レスポンスボディはラッパーなしの裸オブジェクト（配列）です
- `Content-Type: application/json`

### エラーレスポンス（共通）

4xx / 5xx すべてで以下の形式を使用します。

```jsonc
{
  "error": {
    "code": "VALIDATION_ERROR",       // 機械的に識別できる定数
    "message": "emailは必須です",      // 人間向けメッセージ
    "details": [                      // バリデーション等、複数エラー時のみ付与
      { "field": "email", "message": "必須項目です" }
    ]
  }
}
```

**主要エラーコード一覧**

| コード | HTTP ステータス | 説明 |
|--------|----------------|------|
| `VALIDATION_ERROR` | 400 | リクエストパラメータ不正 |
| `UNAUTHORIZED` | 401 | 認証情報なし / トークン期限切れ |
| `FORBIDDEN` | 403 | 権限なし（他ユーザーのリソース等） |
| `NOT_FOUND` | 404 | リソースが存在しない |
| `CONFLICT` | 409 | 一意制約違反（メールアドレス重複等） |
| `INTERNAL_SERVER_ERROR` | 500 | サーバー内部エラー |
| `ROUTE_NOT_FOUND` | 404 | 指定条件で経路が見つからない |
| `OTP_UNAVAILABLE` | 503 | OTP2 サーバーへの接続失敗 |
| `HOME_LOCATION_NOT_SET` | 400 | `UserSettings.home_lat/lon` が未設定 |

---

## Auth（認証）

### POST /auth/register — 新規ユーザー登録

**リクエストボディ**

| パラメータ | 型 | 必須 | 説明 |
|-----------|----|----|------|
| `email` | `string` | ○ | メールアドレス（一意） |
| `password` | `string` | ○ | パスワード |
| `name` | `string` | ○ | 表示名 |
| `home_address` | `string` | ○ | 自宅住所（経路・天気の基点） |
| `home_lat` | `float` | ○ | 自宅の緯度 |
| `home_lon` | `float` | ○ | 自宅の経度 |
| `preparation_minutes` | `integer` | ○ | 身支度時間（分） |
| `reminder_minutes_before` | `integer` | ○ | 出発の何分前に通知するか |

**リクエスト**

```jsonc
{
  "email": "user@example.com",
  "password": "secret",
  "name": "山田太郎",
  "home_address": "東京都渋谷区...",
  "home_lat": 35.658034,
  "home_lon": 139.701636,
  "preparation_minutes": 30,
  "reminder_minutes_before": 30
}
```

**レスポンス `201 Created`**

```jsonc
{
  "user": {
    "id": 1,
    "email": "user@example.com",
    "name": "山田太郎",
    "created_at": "2026-03-01T09:00:00+09:00"
  },
  "access_token": "eyJ...",
  "refresh_token": "dGh...",
  "expires_in": 3600
}
```

> `UserSettings` / `NotificationSettings` はユーザー登録時に同一トランザクションで作成します（`データモデル.md § D-1` 参照）。`UserSettings` の各フィールドは登録時に必須入力です。

---

### POST /auth/login — ログイン

**リクエストボディ**

| パラメータ | 型 | 必須 | 説明 |
|-----------|----|----|------|
| `email` | `string` | ○ | メールアドレス |
| `password` | `string` | ○ | パスワード |

**リクエスト**

```jsonc
{
  "email": "user@example.com",
  "password": "secret"
}
```

**レスポンス `200 OK`**

```jsonc
{
  "access_token": "eyJ...",
  "refresh_token": "dGh...",
  "expires_in": 3600
}
```

---

### POST /auth/logout — ログアウト

**リクエスト**

ボディなし（`Authorization` ヘッダーでトークンを識別）

**レスポンス `204 No Content`**

---

### POST /auth/refresh — アクセストークン更新

**リクエストボディ**

| パラメータ | 型 | 必須 | 説明 |
|-----------|----|----|------|
| `refresh_token` | `string` | ○ | 発行済みリフレッシュトークン |

**リクエスト**

```jsonc
{
  "refresh_token": "dGh..."
}
```

**レスポンス `200 OK`**

```jsonc
{
  "access_token": "eyJ...",
  "expires_in": 3600
}
```

---

## Users（ユーザー）

### GET /users/me — プロフィール取得

**レスポンス `200 OK`**

```jsonc
{
  "id": 1,
  "email": "user@example.com",
  "name": "山田太郎",
  "created_at": "2026-03-01T09:00:00+09:00"
}
```

---

### PUT /users/me — プロフィール更新

部分更新（PATCH セマンティクス）。変更したいフィールドのみ送信可。

**リクエストボディ**

| パラメータ | 型 | 必須 | 説明 |
|-----------|----|----|------|
| `name` | `string` | 任意 | 表示名 |

**リクエスト**

```jsonc
{
  "name": "山田次郎"
}
```

**レスポンス `200 OK`** — 更新後の User オブジェクト

```jsonc
{
  "id": 1,
  "email": "user@example.com",
  "name": "山田次郎",
  "created_at": "2026-03-01T09:00:00+09:00"
}
```

---

### GET /users/me/settings — 個人設定取得

**レスポンス `200 OK`**

```jsonc
{
  "home_address": "東京都渋谷区...",
  "home_lat": 35.658034,
  "home_lon": 139.701636,
  "preparation_minutes": 30,
  "reminder_minutes_before": 30,
  "timezone": "Asia/Tokyo"
}
```

---

### PUT /users/me/settings — 個人設定更新

部分更新（PATCH セマンティクス）。変更したいフィールドのみ送信可。

**リクエストボディ**

| パラメータ | 型 | 必須 | 説明 |
|-----------|----|----|------|
| `home_address` | `string` | 任意 | 自宅住所（ジオコーディングに使用） |
| `home_lat` | `float` | 任意 | 自宅の緯度（直接指定する場合） |
| `home_lon` | `float` | 任意 | 自宅の経度（直接指定する場合） |
| `preparation_minutes` | `integer` | 任意 | 身支度時間（分） |
| `reminder_minutes_before` | `integer` | 任意 | 出発の何分前に通知するか |
| `timezone` | `string` | 任意 | タイムゾーン（例: `Asia/Tokyo`） |

**リクエスト**

```jsonc
{
  "home_address": "東京都新宿区...",
  "preparation_minutes": 20,
  "reminder_minutes_before": 60
}
```

**レスポンス `200 OK`** — 更新後の UserSettings オブジェクト

```jsonc
{
  "home_address": "東京都新宿区...",
  "home_lat": null,
  "home_lon": null,
  "preparation_minutes": 20,
  "reminder_minutes_before": 60,
  "timezone": "Asia/Tokyo"
}
```

> `home_lat` / `home_lon` は住所のジオコーディングをバックエンドで行う場合は自動設定される。未ジオコーディングの場合は `null` を返す。

---

## Schedules（予定）

### GET /schedules — 予定一覧取得

**クエリパラメータ**

| パラメータ | 型 | 必須 | 説明 |
|-----------|----|----|------|
| `start_date` | `YYYY-MM-DD` | 任意 | この日以降の予定 |
| `end_date` | `YYYY-MM-DD` | 任意 | この日以前の予定 |

**レスポンス `200 OK`**

```jsonc
[
  {
    "id": 1,
    "title": "会食",
    "start_at": "2026-03-10T19:00:00+09:00",
    "end_at": "2026-03-10T21:00:00+09:00",
    "destination_name": "銀座 鮨さいとう",
    "destination_address": "東京都中央区銀座...",
    "destination_lat": 35.671,
    "destination_lon": 139.764,
    "travel_mode": "transit",
    "memo": "手土産を持参",
    "tags": [
      { "id": 2, "name": "会食" }
    ],
    "created_at": "2026-03-01T09:00:00+09:00",
    "updated_at": "2026-03-01T09:00:00+09:00"
  }
]
```

---

### POST /schedules — 予定作成

**リクエストボディ**

| パラメータ | 型 | 必須 | 説明 |
|-----------|----|----|------|
| `title` | `string` | ○ | 予定のタイトル |
| `start_at` | `string` | ○ | 開始日時（ISO 8601 JST） |
| `end_at` | `string` | 任意 | 終了日時（ISO 8601 JST）。nullable |
| `destination_name` | `string` | 任意 | 目的地名 |
| `destination_address` | `string` | 任意 | 目的地住所 |
| `destination_lat` | `float` | 任意 | 目的地の緯度。nullable |
| `destination_lon` | `float` | 任意 | 目的地の経度。nullable |
| `travel_mode` | `string` | 任意 | 移動手段。`transit` / `walking` / `cycling` / `driving` |
| `memo` | `string` | 任意 | 準備メモ。nullable |
| `tag_ids` | `array[integer]` | 任意 | 付与するタグの ID 配列 |

**リクエスト**

```jsonc
{
  "title": "会食",
  "start_at": "2026-03-10T19:00:00+09:00",
  "end_at": "2026-03-10T21:00:00+09:00",     // nullable
  "destination_name": "銀座 鮨さいとう",
  "destination_address": "東京都中央区銀座...",
  "destination_lat": 35.671,                  // nullable
  "destination_lon": 139.764,                 // nullable
  "travel_mode": "transit",
  "memo": "手土産を持参",                      // nullable
  "tag_ids": [2]                              // 既存 Tag の ID 配列
}
```

**レスポンス `201 Created`** — 作成された Schedule オブジェクト（`GET /schedules/{id}` と同形式）

---

### GET /schedules/{id} — 予定詳細取得

**レスポンス `200 OK`**

```jsonc
{
  "id": 1,
  "title": "会食",
  "start_at": "2026-03-10T19:00:00+09:00",
  "end_at": "2026-03-10T21:00:00+09:00",
  "destination_name": "銀座 鮨さいとう",
  "destination_address": "東京都中央区銀座...",
  "destination_lat": 35.671,
  "destination_lon": 139.764,
  "travel_mode": "transit",
  "memo": "手土産を持参",
  "tags": [
    { "id": 2, "name": "会食" }
  ],
  "created_at": "2026-03-01T09:00:00+09:00",
  "updated_at": "2026-03-01T09:00:00+09:00"
}
```

---

### PUT /schedules/{id} — 予定更新

部分更新（PATCH セマンティクス）。変更したいフィールドのみ送信可。

**リクエストボディ**

| パラメータ | 型 | 必須 | 説明 |
|-----------|----|----|------|
| `title` | `string` | 任意 | 予定のタイトル |
| `start_at` | `string` | 任意 | 開始日時（ISO 8601 JST） |
| `end_at` | `string` | 任意 | 終了日時（ISO 8601 JST）。nullable |
| `destination_name` | `string` | 任意 | 目的地名 |
| `destination_address` | `string` | 任意 | 目的地住所 |
| `destination_lat` | `float` | 任意 | 目的地の緯度。nullable |
| `destination_lon` | `float` | 任意 | 目的地の経度。nullable |
| `travel_mode` | `string` | 任意 | 移動手段。`transit` / `walking` / `cycling` / `driving` |
| `memo` | `string` | 任意 | 準備メモ。nullable |
| `tag_ids` | `array[integer]` | 任意 | 付与するタグの ID 配列 |

**リクエスト**

```jsonc
{
  "title": "大事な会食",
  "memo": "手土産と名刺を持参",
  "tag_ids": [2, 3]
}
```

**レスポンス `200 OK`** — 更新後の Schedule オブジェクト（`GET /schedules/{id}` と同形式）

---

### DELETE /schedules/{id} — 予定削除

**レスポンス `204 No Content`**

---

## Templates（テンプレート）

> Template は「1日全体の予定集合の雛形」。Template 自体は名前と TemplateCategory のみ持ち、内部に複数の TemplateSchedule（時刻固定の予定雛形）を持つ。
> `POST /templates/{id}/apply` で指定日付に適用すると、TemplateSchedule の `start_time` / `end_time` と日付を組み合わせた Schedule が複数作成される。

### GET /templates — テンプレート一覧取得

**レスポンス `200 OK`**

```jsonc
[
  {
    "id": 1,
    "name": "仕事の日ルーティン",
    "category": { "id": 1, "name": "仕事の日" },
    "schedules": [
      {
        "id": 10,
        "title": "朝の準備",
        "start_time": "07:30",
        "end_time": "08:30",
        "destination_name": null,
        "destination_address": null,
        "destination_lat": null,
        "destination_lon": null,
        "travel_mode": null,
        "memo": "スーツ着用",
        "sort_order": 1,
        "tags": [{ "id": 1, "name": "仕事" }]
      },
      {
        "id": 11,
        "title": "オフィス出勤",
        "start_time": "09:00",
        "end_time": "18:00",
        "destination_name": "本社オフィス",
        "destination_address": "東京都千代田区...",
        "destination_lat": 35.681,
        "destination_lon": 139.767,
        "travel_mode": "transit",
        "memo": null,
        "sort_order": 2,
        "tags": []
      }
    ],
    "created_at": "2026-03-01T09:00:00+09:00",
    "updated_at": "2026-03-01T09:00:00+09:00"
  }
]
```

---

### POST /templates — テンプレート作成

**リクエストボディ**

| パラメータ | 型 | 必須 | 説明 |
|-----------|----|----|------|
| `name` | `string` | ○ | テンプレート名 |
| `category_id` | `integer` | 任意 | TemplateCategory の ID。nullable |
| `schedules` | `array` | 任意 | テンプレート内の予定雛形の配列 |
| `schedules[].title` | `string` | ○ | 予定タイトル |
| `schedules[].start_time` | `string (HH:MM)` | ○ | 開始時刻 |
| `schedules[].end_time` | `string (HH:MM)` | 任意 | 終了時刻。nullable |
| `schedules[].destination_name` | `string` | 任意 | 目的地名。nullable |
| `schedules[].destination_address` | `string` | 任意 | 目的地住所。nullable |
| `schedules[].destination_lat` | `float` | 任意 | 目的地の緯度。nullable |
| `schedules[].destination_lon` | `float` | 任意 | 目的地の経度。nullable |
| `schedules[].travel_mode` | `string` | 任意 | 移動手段。`transit` / `walking` / `cycling` / `driving` |
| `schedules[].memo` | `string` | 任意 | メモ。nullable |
| `schedules[].tag_ids` | `array[integer]` | 任意 | 付与するタグの ID 配列 |
| `schedules[].sort_order` | `integer` | 任意 | 表示順 |

**リクエスト**

```jsonc
{
  "name": "仕事の日ルーティン",
  "category_id": 1,
  "schedules": [
    {
      "title": "朝の準備",
      "start_time": "07:30",
      "end_time": "08:30",
      "memo": "スーツ着用",
      "tag_ids": [1],
      "sort_order": 1
    },
    {
      "title": "オフィス出勤",
      "start_time": "09:00",
      "end_time": "18:00",
      "destination_name": "本社オフィス",
      "destination_address": "東京都千代田区...",
      "destination_lat": 35.681,
      "destination_lon": 139.767,
      "travel_mode": "transit",
      "sort_order": 2
    }
  ]
}
```

**レスポンス `201 Created`** — 作成された Template オブジェクト（`GET /templates/{id}` と同形式）

---

### GET /templates/{id} — テンプレート詳細取得

**レスポンス `200 OK`** — `GET /templates` の単一オブジェクトと同形式

---

### PUT /templates/{id} — テンプレート更新

部分更新（PATCH セマンティクス）。変更したいフィールドのみ送信可。

**リクエストボディ**

| パラメータ | 型 | 必須 | 説明 |
|-----------|----|----|------|
| `name` | `string` | 任意 | テンプレート名 |
| `category_id` | `integer` | 任意 | TemplateCategory の ID。null で解除 |
| `schedules` | `array` | 任意 | 全件置き換え（送信した配列で上書き） |

**リクエスト**

```jsonc
{
  "name": "仕事の日（短縮）"
}
```

**レスポンス `200 OK`** — 更新後の Template オブジェクト（`GET /templates/{id}` と同形式）

---

### DELETE /templates/{id} — テンプレート削除

**レスポンス `204 No Content`**

---

### POST /templates/{id}/apply — テンプレートを指定日付に適用して予定を一括作成

テンプレート内のすべての TemplateSchedule の `start_time` / `end_time` を指定日付と組み合わせて、複数の Schedule を一括作成します。
テンプレートを後から編集しても作成済み予定には影響しません（データモデル § 設計メモ 参照）。

**リクエストボディ**

| パラメータ | 型 | 必須 | 説明 |
|-----------|----|----|------|
| `date` | `string (YYYY-MM-DD)` | ○ | 適用する日付。`start_time` / `end_time` と組み合わせて Schedule の `start_at` / `end_at` を生成 |

**リクエスト**

```jsonc
{
  "date": "2026-03-10"
}
```

**レスポンス `201 Created`** — 作成された Schedule オブジェクトの配列

```jsonc
[
  {
    "id": 101,
    "title": "朝の準備",
    "start_at": "2026-03-10T07:30:00+09:00",
    "end_at": "2026-03-10T08:30:00+09:00",
    "destination_name": null,
    "destination_address": null,
    "destination_lat": null,
    "destination_lon": null,
    "travel_mode": null,
    "memo": "スーツ着用",
    "tags": [{ "id": 1, "name": "仕事" }],
    "created_at": "2026-03-01T09:00:00+09:00",
    "updated_at": "2026-03-01T09:00:00+09:00"
  },
  {
    "id": 102,
    "title": "オフィス出勤",
    "start_at": "2026-03-10T09:00:00+09:00",
    "end_at": "2026-03-10T18:00:00+09:00",
    "destination_name": "本社オフィス",
    "destination_address": "東京都千代田区...",
    "destination_lat": 35.681,
    "destination_lon": 139.767,
    "travel_mode": "transit",
    "memo": null,
    "tags": [],
    "created_at": "2026-03-01T09:00:00+09:00",
    "updated_at": "2026-03-01T09:00:00+09:00"
  }
]
```

---

## Weather（天気）

> **使用外部 API:** WeatherAPI.com（詳細は `api仕様.md § 天気` 参照）

### GET /weather — 指定日時・場所の天気取得

**クエリパラメータ**

| パラメータ | 型 | 必須 | 説明 |
|-----------|----|----|------|
| `lat` | `float` | ○ | 緯度 |
| `lon` | `float` | ○ | 経度 |
| `date` | `YYYY-MM-DD` | 任意 | 対象日付（省略時は今日） |

**レスポンス `200 OK`**

```jsonc
{
  "date": "2026-03-10",
  "location": {
    "name": "Shibuya",
    "lat": 35.658,
    "lon": 139.701
  },
  "temp_c": 12.5,
  "condition": "Partly cloudy",
  "condition_icon_url": "//cdn.weatherapi.com/weather/64x64/day/116.png",
  "precip_mm": 0.0,
  "chance_of_rain": 10,
  "humidity": 55,
  "wind_kph": 8.3
}
```

---

### GET /weather/forecast — 複数日分の天気予報取得

**クエリパラメータ**

| パラメータ | 型 | 必須 | 説明 |
|-----------|----|----|------|
| `lat` | `float` | ○ | 緯度 |
| `lon` | `float` | ○ | 経度 |

**レスポンス `200 OK`**（無料プランにつき 3 日分）

```jsonc
{
  "location": {
    "name": "Shibuya",
    "lat": 35.658,
    "lon": 139.701
  },
  "forecast": [
    {
      "date": "2026-03-01",
      "avg_temp_c": 11.2,
      "max_temp_c": 14.0,
      "min_temp_c": 7.5,
      "condition": "Sunny",
      "condition_icon_url": "//cdn.weatherapi.com/weather/64x64/day/113.png",
      "chance_of_rain": 5
    },
    {
      "date": "2026-03-02",
      "avg_temp_c": 9.8,
      "max_temp_c": 12.1,
      "min_temp_c": 6.3,
      "condition": "Overcast",
      "condition_icon_url": "//cdn.weatherapi.com/weather/64x64/day/122.png",
      "chance_of_rain": 40
    },
    {
      "date": "2026-03-03",
      "avg_temp_c": 8.5,
      "max_temp_c": 10.2,
      "min_temp_c": 5.9,
      "condition": "Light rain",
      "condition_icon_url": "//cdn.weatherapi.com/weather/64x64/day/296.png",
      "chance_of_rain": 75
    }
  ]
}
```

---

## Notifications（通知設定）

### GET /notifications/settings — 通知設定取得

**レスポンス `200 OK`**

```jsonc
{
  "weather_enabled": true,
  "weather_notify_time": "07:00",
  "reminder_enabled": true
}
```

---

### PUT /notifications/settings — 通知設定更新

部分更新（PATCH セマンティクス）。変更したいフィールドのみ送信可。

**リクエストボディ**

| パラメータ | 型 | 必須 | 説明 |
|-----------|----|----|------|
| `weather_enabled` | `boolean` | 任意 | 天気通知の有効/無効 |
| `weather_notify_time` | `string` | 任意 | 天気通知時刻（`HH:MM` 形式） |
| `reminder_enabled` | `boolean` | 任意 | 出発リマインダーの有効/無効 |

**リクエスト**

```jsonc
{
  "weather_notify_time": "08:00",
  "reminder_enabled": true
}
```

**レスポンス `200 OK`** — 更新後の NotificationSettings オブジェクト

```jsonc
{
  "weather_enabled": true,
  "weather_notify_time": "08:00",
  "reminder_enabled": true
}
```

---

### POST /notifications/tokens — デバイストークン登録

**リクエストボディ**

| パラメータ | 型 | 必須 | 説明 |
|-----------|----|----|------|
| `token` | `string` | ○ | FCM デバイストークン |
| `platform` | `string` | ○ | プラットフォーム。`"ios"` または `"android"` |

**リクエスト**

```jsonc
{
  "token": "fcm-token-string...",
  "platform": "ios"               // "ios" | "android"
}
```

**レスポンス `201 Created`**

```jsonc
{
  "id": 5,
  "token": "fcm-token-string...",
  "platform": "ios",
  "created_at": "2026-03-01T09:00:00+09:00"
}
```

---

### DELETE /notifications/tokens/{token} — デバイストークン削除

**レスポンス `204 No Content`**

---

## Routes（経路）

> **使用外部 API:** OTP2（OpenTripPlanner 2）— 詳細は `backend/docs/spec/経路探索API設計.md` を参照

### POST /routes/departure-time — 出発時刻逆算・経路候補取得

目的地座標と到着希望時刻を受け取り、「いつ家を出ればよいか（`leave_home_at`）」「いつ身支度を始めればよいか（`start_preparation_at`）」および複数経路候補（`itineraries[]`）を返す。出発地は `UserSettings.home_lat` / `home_lon` を自動取得するためリクエストに含める必要はない。

**リクエストパラメータ**

| フィールド | 型 | 必須 | 説明 |
|-----------|----|----|------|
| `destination_lat` | `float` | ○ | 目的地の緯度 |
| `destination_lon` | `float` | ○ | 目的地の経度 |
| `arrival_time` | `string` | ○ | 到着希望時刻（ISO 8601 JST） |
| `travel_mode` | `string` | ○ | 移動手段。`transit` / `walking` / `cycling` / `driving` |

> サーバーが自動取得する値: `UserSettings.home_lat` / `home_lon`（出発地）、`UserSettings.preparation_minutes`（身支度時間）

**リクエスト**

```jsonc
{
  "destination_lat": 35.6580,                    // 必須
  "destination_lon": 139.7016,                   // 必須
  "arrival_time": "2026-03-10T19:00:00+09:00",   // 必須。ISO 8601 JST
  "travel_mode": "transit"                        // 必須。"transit" / "walking" / "cycling" / "driving"
  // origin_lat / origin_lon は UserSettings.home_lat / home_lon を自動取得
  // preparation_minutes は UserSettings.preparation_minutes を自動取得
}
```

**レスポンスフィールド**

| フィールド | 説明 |
|-----------|------|
| `leave_home_at` | 家を出るべき時刻（`itineraries[0].departure_time`） |
| `start_preparation_at` | 身支度を始めるべき時刻（`leave_home_at` - `preparation_minutes`） |
| `preparation_minutes` | 使用した身支度時間（`UserSettings` から取得、確認用） |
| `arrival_time` | リクエストで指定した到着時刻（確認用） |
| `itineraries[]` | OTP2 が返す経路候補の配列（最大5件）。`itineraries[0]` が最速ルート |
| `itineraries[].departure_time` | 出発時刻 |
| `itineraries[].arrival_time` | 到着時刻 |
| `itineraries[].duration_minutes` | 総所要時間（分） |
| `itineraries[].number_of_transfers` | 乗り換え回数（`transit` のみ返却） |
| `itineraries[].legs` | 区間ごとの移動情報 |

**レスポンス `200 OK`**

```jsonc
{
  "leave_home_at": "2026-03-10T18:12:00+09:00",         // itineraries[0].departure_time
  "start_preparation_at": "2026-03-10T17:42:00+09:00",   // leave_home_at - preparation_minutes（身支度を始める時刻）
  "preparation_minutes": 30,                               // UserSettings から取得した値（確認用）
  "arrival_time": "2026-03-10T19:00:00+09:00",            // リクエストで指定した到着時刻（確認用）
  "itineraries": [                                         // 経路候補の配列（最大5件）。itineraries[0] が最速ルート
    {
      "departure_time": "2026-03-10T18:12:00+09:00",
      "arrival_time": "2026-03-10T18:58:00+09:00",
      "duration_minutes": 46,
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
          "agency_name": "JR東日本",
          "headsign": "東京方面",
          "from_name": "高円寺駅",
          "to_name": "新宿駅",
          "departure_time": "2026-03-10T18:23:00+09:00",
          "arrival_time": "2026-03-10T18:29:00+09:00",
          "duration_minutes": 6
        }
      ]
    },
    { }   // 最大5件
  ]
}
```

> **travel_mode 別の legs フィールド差異:**
> - `transit`: legs に WALK + RAIL/SUBWAY/BUS が混在。RAIL/SUBWAY/BUS の legs には `route_short_name`, `agency_name`, `headsign` を含む。`number_of_transfers` を返却。
> - `walking` / `cycling` / `driving`: legs は1件のみ（WALK / BICYCLE / CAR）。`route_short_name`, `agency_name`, `headsign`, `number_of_transfers` は返却しない。

> `UserSettings.home_lat` / `home_lon` が未設定の場合は `HOME_LOCATION_NOT_SET (400)` を返します。

---

## Suggestions（提案）

> Gemini API を使った AI 提案。今日の提案と予定ごとの提案の 2 エンドポイント。

### GET /suggestions/today — 今日の提案

クエリパラメータなし（ログインユーザーの今日の予定と自宅座標の天気をサーバーが自動取得）。

**バックエンド処理:**
1. ログインユーザーの今日の Schedule 一覧を取得
2. `GET /weather` で自宅座標の今日の天気を取得
3. 予定情報 + 天気情報を Gemini API に渡し、服装・持ち物の提案を生成

**レスポンス `200 OK`**

```jsonc
{
  "date": "2026-03-10",
  "suggestion": "今日は最高気温12℃で午後から雨の予報です。折りたたみ傘を持参し、暖かいコートを着ていくことをおすすめします。夕方に会食があるため、スマートカジュアルな服装が適しています。",
  "weather_summary": {
    "temp_c": 12.5,
    "condition": "Partly cloudy",
    "chance_of_rain": 60
  }
}
```

---

### GET /suggestions/{schedule_id} — 予定ごとの提案

**バックエンド処理:**
1. 指定した Schedule を取得
2. Schedule の目的地・タグ・メモ情報を Gemini API に渡し、目的地周辺スポット・その予定に関連したアドバイスを生成

**レスポンス `200 OK`**

```jsonc
{
  "schedule_id": 1,
  "suggestion": "銀座鮨さいとうの周辺には、食後に立ち寄れる老舗バーや手土産に最適な和菓子店があります。会食前に近くのギャラリーで時間を潰すのもおすすめです。手土産は資生堂パーラーのケーキが喜ばれます。"
}
```

**エラー:** 予定が見つからない場合は `NOT_FOUND (404)`

---

## Tags（タグ）

> タグはグローバル（全ユーザー共通）。seed データで事前定義。`POST /tags` は実装しない（`データモデル.md § A-1, A-2` 参照）。

### GET /tags — タグ一覧取得

**レスポンス `200 OK`**

```jsonc
[
  { "id": 1, "name": "仕事" },
  { "id": 2, "name": "会食" },
  { "id": 3, "name": "デート" },
  { "id": 4, "name": "運動" }
]
```

---
