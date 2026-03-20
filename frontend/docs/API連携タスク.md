# API連携タスク一覧

> 最終更新: 2026-03-20
> 参照: [フロントAPI連携状況.md](./フロントAPI連携状況.md)

## 優先度の考え方
- **P0**: アプリのコア機能。これがないとデモ・利用不可
- **P1**: ユーザー体験に直結する重要機能
- **P2**: あると便利だが後回し可能

---

## T0: APIクライアント基盤拡張 [P0]

**ファイル**: `lib/api-client.ts`

- [ ] `apiPut<T>(path, body)` を追加（設定更新・スケジュール更新で必要）
- [ ] `apiDelete(path)` を追加（スケジュール削除で必要）
- [ ] エラーハンドリングの共通化（トークン期限切れ時の自動リフレッシュ等）

---

## T1: ホーム画面（本日の予定）API連携 [P0]

**ファイル**: `app/(tabs)/index.tsx`
**現状**: L28-83のモックデータ（タイムライン・天気・イベント）をハードコード

### やること
- [ ] `GET /schedules?start_date=今日&end_date=今日` でスケジュール一覧を取得
- [ ] `GET /schedule-lists?start_date=今日&end_date=今日` でスケジュールリスト（持ち物含む）を取得
- [ ] `GET /weather/forecast?lat=自宅lat&lon=自宅lon` で天気予報を取得
- [ ] `GET /users/me/settings` から自宅座標を取得（天気APIのパラメータに使用）
- [ ] モックの `TIMELINE` 定数を削除し、APIレスポンスからタイムラインを構築
- [ ] ローディング状態・エラー状態のUI追加

### 使用APIレスポンス型（要定義）
- `ScheduleResponse[]` — スケジュール一覧
- `ScheduleListResponse[]` — リスト一覧
- `ForecastResponse` — 天気予報

---

## T2: カレンダー画面 API連携 [P0]

**ファイル**: `app/(tabs)/calendar.tsx`
**現状**: L21-26に4件のハードコードイベント

### やること
- [ ] `GET /schedules?start_date=月初&end_date=月末` で月間スケジュールを取得
- [ ] `GET /schedule-lists?start_date=月初&end_date=月末` でスケジュールリストを取得
- [ ] モックの `EVENTS` 定数を削除し、APIレスポンスからカレンダーにドットマーカー表示
- [ ] 日付タップ時にその日のスケジュール一覧を表示
- [ ] 月切り替え時にAPIを再取得

---

## T3: スケジュール作成画面 — 保存処理 [P0]

**ファイル**: `app/schedule/create.tsx`
**現状**: L270に`TODO: API integration`コメント。ルート検索のみ連携済み。

### やること
- [ ] `handleAdd()` 関数で `POST /schedules` を呼び出してスケジュールを保存
- [ ] フォームの入力値（タイトル、日時、目的地、移動手段、タグ、メモ）をリクエストボディに変換
- [ ] 保存成功時にスケジュール詳細画面またはホームに遷移
- [ ] 保存失敗時にエラーメッセージを表示
- [ ] `GET /tags` でタグ一覧を取得し、カテゴリピルに反映（現在ハードコードの可能性）

---

## T4: ルーティン（テンプレート一覧）画面 API連携 [P1]

**ファイル**: `app/(tabs)/routine.tsx`
**現状**: L28-58にハードコードされたルーティン

### やること
- [ ] `GET /templates` でテンプレート一覧を取得
- [ ] モックの `FREQUENT_ROUTINES` / `RECENT_ROUTINES` 定数を削除
- [ ] テンプレートのカテゴリ別表示（仕事の日、在宅勤務、休日）
- [ ] テンプレートタップ時に詳細画面に遷移（T8で実装）
- [ ] テンプレート適用ボタン → `POST /templates/{id}/apply` で日付指定してスケジュール作成

---

## T5: スケジュール詳細画面 API連携 [P1]

**ファイル**: `app/schedule/index.tsx`
**現状**: L51-103にモックTODO・天気・ルーティンデータ

### やること
- [ ] 画面遷移時にスケジュールIDまたはスケジュールリストIDをパラメータで受け取る
- [ ] `GET /schedule-lists/{id}` でリスト詳細（スケジュール + 持ち物）を取得
- [ ] `GET /schedules/{id}` で個別スケジュール詳細を取得
- [ ] `GET /schedules/{id}/route` で保存済みルートを表示
- [ ] 持ち物チェックボックス → `PUT /schedule-lists/{id}/packing-items/{item_id}` で更新
- [ ] モックデータを削除し、APIレスポンスで置き換え

---

## T6: スケジュール登録画面 — 保存処理 [P1]

**ファイル**: `app/schedule/register.tsx`
**現状**: L43-65にモックデータ。成功モーダルは表示されるが保存されない。

### やること
- [ ] `POST /schedule-lists` でスケジュールリストを作成
- [ ] リスト内の各スケジュールを `POST /schedules` で作成（`schedule_list_id` を紐付け）
- [ ] 持ち物があれば `POST /schedule-lists/{id}/packing-items` で追加
- [ ] 成功時にホーム or カレンダーに遷移

---

## T7: マイページ画面 実装 [P1]

**ファイル**: `app/(tabs)/mypage.tsx`
**現状**: 「マイページ」テキストのみのスタブ

### やること
- [ ] `GET /users/me` でユーザープロフィール（名前、メール）を表示
- [ ] `GET /users/me/settings` で設定情報（自宅住所、準備時間、リマインダー時間）を表示
- [ ] 設定編集フォーム → `PUT /users/me/settings` で更新
- [ ] `GET /notifications/settings` で通知設定を表示
- [ ] 通知ON/OFFトグル → `PUT /notifications/settings` で更新
- [ ] ログアウトボタン → `POST /auth/logout`

---

## T8: テンプレート詳細画面 新規作成 [P2]

**ファイル**: 新規（`app/template/[id].tsx` 等）

### やること
- [ ] `GET /templates/{id}` でテンプレート詳細を表示
- [ ] テンプレート内のスケジュール一覧をリスト表示
- [ ] 「この日に適用」ボタン → 日付ピッカー → `POST /templates/{id}/apply`
- [ ] 編集ボタン → `PUT /templates/{id}` でテンプレート更新
- [ ] 削除ボタン → `DELETE /templates/{id}`

---

## T9: 出発時刻計算の連携 [P2]

**使用画面**: ホーム画面、スケジュール詳細画面

### やること
- [ ] `POST /routes/departure-time` で「何時に家を出ればいいか」を計算
- [ ] ホーム画面のタイムラインに出発時刻・準備開始時刻を表示
- [ ] スケジュール詳細画面にも表示

---

## T10: AI提案機能の連携 [P2]

**使用画面**: ホーム画面

### やること
- [ ] `GET /suggestions/today` で今日の提案（服装・持ち物・スポット）を取得
- [ ] ホーム画面の適切な場所に提案カードを表示

---

## T11: ログイン/サインアップ画面 [P2]

**ファイル**: 新規（`app/auth/login.tsx`, `app/auth/register.tsx` 等）

### やること
- [ ] ログインフォーム → `POST /auth/login`
- [ ] サインアップフォーム → `POST /auth/register`
- [ ] トークンをSecureStore等に保存
- [ ] `api-client.ts` のハードコードされたテストアカウント自動ログインを削除
- [ ] 未認証時にログイン画面にリダイレクト

---

## 作業順序の推奨

```
T0 (APIクライアント拡張)
  ↓
T3 (スケジュール作成・保存) ← ルート検索は既に動いてるのでここから
  ↓
T1 (ホーム画面) + T2 (カレンダー画面)  ← 並行作業可
  ↓
T5 (スケジュール詳細) + T4 (ルーティン一覧) ← 並行作業可
  ↓
T6 (スケジュール登録)
  ↓
T7 (マイページ)
  ↓
T8〜T11 (詳細・提案・認証)
```
