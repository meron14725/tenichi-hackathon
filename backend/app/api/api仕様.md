# API仕様（全体像）

> このドキュメントは `docs/キックオフ.md` の「欲しい機能」をもとに、
> バックエンドとして必要なAPIエンドポイントの全体像を整理したものです。
> 詳細なリクエスト/レスポンス設計は各機能の詳細設計フェーズで別途行います。

---

## ⚠️ 詳細設計の前に決めるべきこと

API設計を詳細化する前に、以下を先にチームで確認・決定してください。
これらが未定だと仕様が大きく変わる可能性があります。

### 1. 外部API選定

天気・経路はバックエンドが外部APIを叩く **BFF（Backend For Frontend）構成** になる想定です。
どのAPIを使うかによってI/Fが変わるため、早めに選定が必要です。

| 機能 | 候補 | 備考 |
|------|------|------|
| 天気 | **WeatherAPI.com**（決定） | 1M calls/月・無料登録・日本対応。APIキー必要。無料プランで3日分予報まで |
| 経路（電車） | 乗換案内API（Yahoo! / Navitime等） / Google Directions API | 電車対応は有料が多い |
| 経路（徒歩・車） | Google Maps Platform | Maps APIとセットで検討 |
| 地図リンク | Google Maps ディープリンク | APIキー不要、URLスキームで対応可 |

### 2. 認証方式

- **JWT（推奨・シンプル）**: メールアドレス＋パスワードでのサインイン
- **OAuth2（拡張性あり）**: Googleログイン連携や将来のGoogleカレンダー取り込みを考えるなら検討
- → Googleカレンダー連携がスコープ内かどうかを先に確認すること

### 3. データモデル / ER図

✅ **確定済み** — `backend/docs/データモデル草案.md` に全エンティティのリレーション設計が完成しています。

主要エンティティ: `User` / `UserSettings` / `Schedule` / `Template` / `TemplateSchedule` / `TemplateCategory` / `NotificationSettings` / `DeviceToken` / `Tag`

### 4. Miro画面フロー確認

UIのオブジェクト指向設計（https://miro.com/app/board/uXjVG8RL25g=/ ）と
照合して、APIの過不足を検証してください。

---

## API一覧

ベースURL: `/api/v1`

### 認証 (Auth)

ログイン機能・ユーザー新規登録機能に対応。

| メソッド | エンドポイント | 概要 |
|---------|--------------|------|
| POST | `/auth/register` | 新規ユーザー登録 |
| POST | `/auth/login` | ログイン（トークン発行） |
| POST | `/auth/logout` | ログアウト（トークン無効化） |
| POST | `/auth/refresh` | アクセストークン更新 |

---

### ユーザー (Users)

マイページ機能・アカウント設定・個人設定に対応。

| メソッド | エンドポイント | 概要 |
|---------|--------------|------|
| GET | `/users/me` | 自分のプロフィール取得 |
| PUT | `/users/me` | プロフィール更新（名前等） |
| GET | `/users/me/settings` | 個人設定取得（住所・身支度時間等） |
| PUT | `/users/me/settings` | 個人設定更新 |

**個人設定（`/users/me/settings`）で管理する項目:**
- 自宅住所（経路・天気の基点）
- 身支度時間（出発時刻の逆算に使用）
- 出発リマインダーの事前通知時間（`reminder_minutes_before`、登録時必須入力）
- タイムゾーン

---

### 予定 (Schedules)

予定リスト表示機能・予定を立てる機能・カレンダー機能に対応。

| メソッド | エンドポイント | 概要 |
|---------|--------------|------|
| GET | `/schedules` | 予定一覧取得（日付範囲でフィルタ） |
| POST | `/schedules` | 予定作成 |
| GET | `/schedules/{id}` | 予定詳細取得 |
| PUT | `/schedules/{id}` | 予定更新 |
| DELETE | `/schedules/{id}` | 予定削除 |

**予定データで持つ項目（想定）:**
- タイトル、日時（開始・終了）
- 目的地（名称・住所・座標）
- タグ（デート・会食などTPO）
- 準備事項（メモ）

---

### 天気 (Weather)

天気表示機能・プッシュ通知（天気情報）に対応。
※バックエンドが外部天気APIをラップするBFF。

| メソッド | エンドポイント | 概要 |
|---------|--------------|------|
| GET | `/weather` | 指定日時・場所の天気取得 |
| GET | `/weather/forecast` | 複数日分の天気予報取得 |

**クエリパラメータ（想定）:**
- `lat`, `lon` or `address` — 場所指定
- `date` — 日付指定（省略時は今日）

**使用外部API: WeatherAPI.com**

| 内部エンドポイント | 外部APIエンドポイント | 主要取得フィールド |
|------------------|---------------------|-----------------|
| `GET /weather`（当日） | `/v1/current.json` | `current.temp_c`, `current.condition.text`, `current.precip_mm` |
| `GET /weather`（指定日） | `/v1/forecast.json?days=N` | `forecastday[n].day.daily_chance_of_rain`, `avgtemp_c` |
| `GET /weather/forecast` | `/v1/forecast.json?days=3` | `forecastday[]`（3日分、無料プラン） |

**クエリパラメータ → WeatherAPI.com の `q` パラメータへのマッピング:**
- `lat` + `lon` → `q={lat},{lon}`
- `address` → `q={address}`

---

### 経路 (Routes)

案内機能・出発時刻予想機能に対応。
※バックエンドが外部経路APIをラップするBFF。

| メソッド | エンドポイント | 概要 |
|---------|--------------|------|
| POST | `/routes/departure-time` | 到着時刻から出発時刻を逆算・複数経路候補を取得 |

**`/routes/departure-time` リクエスト想定項目:**
- `destination_lat`、`destination_lon`、`arrival_time`、`travel_mode`
- 出発地（`home_lat` / `home_lon`）・身支度時間（`preparation_minutes`）はサーバーが `UserSettings` から自動取得

---

### テンプレート (Templates)

テンプレート機能・マイページ > テンプレート設定に対応。
テンプレートは「1日の予定集合の雛形」。複数の予定雛形（TemplateSchedule）を内包し、指定日付に一括適用して Schedule を複数作成できる。

| メソッド | エンドポイント | 概要 |
|---------|--------------|------|
| GET | `/templates` | テンプレート一覧取得 |
| POST | `/templates` | テンプレート作成 |
| GET | `/templates/{id}` | テンプレート詳細取得 |
| PUT | `/templates/{id}` | テンプレート更新 |
| DELETE | `/templates/{id}` | テンプレート削除 |
| POST | `/templates/{id}/apply` | テンプレートを指定日付に適用して予定を一括作成 |

**テンプレートデータで持つ項目:**
- テンプレート名
- 種別（TemplateCategory マスタ、nullable）
- 予定雛形の配列（TemplateSchedule、複数件）
  - タイトル・固定時刻（HH:MM）・目的地・移動手段・メモ・タグ・表示順

---

### 通知設定 (Notifications)

プッシュ通知機能（天気情報・予定リマインダー）に対応。

| メソッド | エンドポイント | 概要 |
|---------|--------------|------|
| GET | `/notifications/settings` | 通知設定取得 |
| PUT | `/notifications/settings` | 通知設定更新 |
| POST | `/notifications/tokens` | デバイストークン登録（FCM/APNs） |
| DELETE | `/notifications/tokens/{token}` | デバイストークン削除 |

**通知設定で管理する項目:**
- 天気通知のON/OFF・通知時刻（例: 毎朝7時）
- 予定リマインダーのON/OFF（通知時間は `UserSettings.reminder_minutes_before` で管理）

---

### タグ (Tags)

タグ選択 UI で使用するタグマスタの取得・管理に対応。
全ユーザー共通のグローバルタグとして管理します（`データモデル草案.md § A-1` 参照）。

| メソッド | エンドポイント | 概要 |
|---------|--------------|------|
| GET | `/tags` | タグ一覧取得 |

> **確定:** タグはグローバル（全ユーザー共通）、事前定義のみ（seed データ投入）。
> `POST /tags` は実装しない（`データモデル草案.md § A-1, A-2` 参照）。
> リクエスト / レスポンスの詳細は `docs/API詳細設計.md` を参照。

---

### 提案 (Suggestions)

提案機能（服装・持ち物・おすすめスポット）に対応。Gemini API を使った AI 提案。

| メソッド | エンドポイント | 概要 |
|---------|--------------|------|
| GET | `/suggestions/today` | 今日の予定と天気に基づく服装・持ち物の提案を取得 |
| GET | `/suggestions/{id}` | 指定した予定の目的地周辺スポット・関連アドバイスを取得 |

**`/suggestions/today`:**
- クエリパラメータなし。ログインユーザーの今日の予定 + 自宅座標の天気情報を自動取得し Gemini API で提案生成

**`/suggestions/{id}`:**
- `{id}` は Schedule の ID
- 指定した予定の目的地・タグ・メモ情報をもとに Gemini API で提案生成

---

## 今後の設計フロー（推奨）

```
1. 外部API選定・認証方式決定
      ↓
2. データモデル(ER図)設計
      ↓
3. Miro画面フローと突き合わせてAPIの過不足を確認
      ↓
4. 機能ごとにリクエスト/レスポンス詳細設計
      ↓
5. 実装・テスト
```
