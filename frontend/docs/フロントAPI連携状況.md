# フロントエンド API連携状況

> 最終更新: 2026-03-20

## テスト用アカウント

| 項目 | 値 |
|------|-----|
| Email | `test-claude-api@example.com` |
| Password | `TestPass123` |
| User ID | 5 |
| Swagger UI | https://fastapi-backend-825512055944.asia-northeast1.run.app/docs |

> `lib/api-client.ts` 内でこのアカウントで自動ログインする仕組みになっている

---

## APIクライアント基盤

| 項目 | 状態 | 備考 |
|------|------|------|
| APIクライアント | ✅ 実装済み | `lib/api-client.ts` |
| `apiGet<T>()` | ✅ | GET リクエスト |
| `apiPost<T>()` | ✅ | POST リクエスト |
| `apiPut<T>()` | ❌ 未実装 | PUT リクエスト（設定更新・スケジュール更新に必要） |
| `apiDelete<T>()` | ❌ 未実装 | DELETE リクエスト（スケジュール削除に必要） |
| 認証 | ⚠️ 仮実装 | テストアカウントでハードコード自動ログイン |
| Base URL | ✅ | `https://fastapi-backend-825512055944.asia-northeast1.run.app/api/v1` |

---

## 画面ごとのAPI連携状況

### ✅ API連携済み

| 画面/コンポーネント | ファイル | 使用API | 備考 |
|---|---|---|---|
| ルート検索結果 | `components/route-results.tsx` | `POST /routes/search` | transit/driving/walking の3モード対応 |
| 目的地ピッカー | `app/schedule/destination-picker.tsx` | Google Maps Places API | バックエンドAPI不要（外部API直接利用） |

### ⚠️ 部分的に連携

| 画面 | ファイル | 連携済み | 未連携 |
|---|---|---|---|
| スケジュール作成 | `app/schedule/create.tsx` | ルート検索（RouteResultsコンポーネント経由） | スケジュール保存（`POST /schedules`）が未実装。L270に`TODO: API integration`コメントあり |

### ❌ 未連携（モックデータ使用）

| 画面 | ファイル | 現状のデータ | 連携すべきAPI |
|---|---|---|---|
| ホーム（本日の予定） | `app/(tabs)/index.tsx` | L28-83にハードコードされたタイムライン・天気・イベント | `GET /schedules`, `GET /schedule-lists`, `GET /weather`, `GET /suggestions/today` |
| カレンダー | `app/(tabs)/calendar.tsx` | L21-26にハードコードされた4件のイベント | `GET /schedules` (月単位), `GET /schedule-lists` |
| ルーティン（テンプレート一覧） | `app/(tabs)/routine.tsx` | L28-58にハードコードされたルーティン | `GET /templates` |
| スケジュール詳細 | `app/schedule/index.tsx` | L51-103にモックTODO・天気・ルーティン | `GET /schedule-lists/{id}`, `GET /schedules/{id}`, `GET /weather` |
| スケジュール登録 | `app/schedule/register.tsx` | L43-65にモックデータ、保存処理なし | `POST /schedules`, `POST /schedule-lists` |

### ❌ 未実装（スタブ/プレースホルダー）

| 画面 | ファイル | 現状 | 連携すべきAPI |
|---|---|---|---|
| マイページ | `app/(tabs)/mypage.tsx` | 「マイページ」テキストのみ | `GET /users/me`, `GET /users/me/settings`, `PUT /users/me/settings`, `GET /notifications/settings` |

### ❌ 画面自体が未実装

| 画面 | 連携すべきAPI |
|---|---|
| ログイン画面 | `POST /auth/login` |
| サインアップ画面 | `POST /auth/register` |
| テンプレート詳細画面 | `GET /templates/{id}`, `PUT /templates/{id}`, `DELETE /templates/{id}`, `POST /templates/{id}/apply` |

---

## バックエンドAPIエンドポイント連携マトリクス

| エンドポイント | メソッド | 用途 | 連携状況 | 使用画面 |
|---|---|---|---|---|
| `/auth/login` | POST | ログイン | ✅ 自動ログイン | api-client.ts |
| `/auth/register` | POST | ユーザー登録 | ❌ | （ログイン画面未実装） |
| `/auth/refresh` | POST | トークン更新 | ❌ | — |
| `/auth/logout` | POST | ログアウト | ❌ | — |
| `/users/me` | GET | プロフィール取得 | ❌ | マイページ |
| `/users/me` | PUT | プロフィール更新 | ❌ | マイページ |
| `/users/me/settings` | GET | 設定取得 | ❌ | マイページ |
| `/users/me/settings` | PUT | 設定更新 | ❌ | マイページ |
| `/schedules` | GET | スケジュール一覧 | ❌ | ホーム, カレンダー |
| `/schedules` | POST | スケジュール作成 | ❌ | スケジュール作成 |
| `/schedules/{id}` | GET | スケジュール詳細 | ❌ | スケジュール詳細 |
| `/schedules/{id}` | PUT | スケジュール更新 | ❌ | スケジュール編集 |
| `/schedules/{id}` | DELETE | スケジュール削除 | ❌ | スケジュール詳細 |
| `/schedules/{id}/route` | POST | ルート保存 | ❌ | スケジュール作成 |
| `/schedules/{id}/route` | GET | ルート取得 | ❌ | スケジュール詳細 |
| `/schedule-lists` | GET | リスト一覧 | ❌ | ホーム, カレンダー |
| `/schedule-lists` | POST | リスト作成 | ❌ | スケジュール登録 |
| `/schedule-lists/{id}` | GET | リスト詳細 | ❌ | スケジュール詳細 |
| `/schedule-lists/{id}/packing-items` | POST | 持ち物追加 | ❌ | スケジュール詳細 |
| `/templates` | GET | テンプレート一覧 | ❌ | ルーティン |
| `/templates` | POST | テンプレート作成 | ❌ | — |
| `/templates/{id}` | GET | テンプレート詳細 | ❌ | （画面未実装） |
| `/templates/{id}/apply` | POST | テンプレート適用 | ❌ | ルーティン |
| `/routes/search` | POST | ルート検索 | ✅ | スケジュール作成 |
| `/routes/departure-time` | POST | 出発時刻計算 | ❌ | ホーム |
| `/tags` | GET | タグ一覧 | ❌ | スケジュール作成 |
| `/weather` | GET | 天気情報 | ❌ | ホーム, スケジュール詳細 |
| `/weather/forecast` | GET | 天気予報 | ❌ | ホーム |
| `/suggestions/today` | GET | 今日の提案 | ❌ | ホーム |
| `/notifications/settings` | GET | 通知設定取得 | ❌ | マイページ |
| `/notifications/settings` | PUT | 通知設定更新 | ❌ | マイページ |

---

## 連携率

- **連携済みエンドポイント**: 2 / 30 (約 7%)
- **連携済み画面**: 1.5 / 9 (ルート検索 + スケジュール作成の一部)
