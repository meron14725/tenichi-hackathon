# デプロイメントチェックリスト

> **目的:** 実装着手前に確認・完了すべき「実装・インフラ設定以外」のタスクを一覧化する。
> Phase 1（基盤構築）に着手する前にすべてのブロッカー項目を解消すること。

---

## 1. インフラ技術選定の最終決定

> 参照: `docs/インフラ設計調査.md § 意思決定チェックリスト`

| # | 決定事項 | 推奨 | 候補 | ステータス |
|---|---------|------|------|-----------|
| 1-1 | APIサーバーのデプロイ先 | Cloud Run（GCP経験あり）/ Render（最速） | Cloud Run / Render / Railway / fly.io | ❌ 未決定 |
| 1-2 | フロントエンドホスティング | Vercel（最速）/ Firebase Hosting（GCP統合） | Firebase Hosting / Vercel / Netlify | ❌ 未決定 |
| 1-3 | DBホスティング | Supabase | Supabase / Neon / Railway PostgreSQL | ❌ 未決定 |
| 1-4 | プッシュ通知サービス | FCM | FCM / AWS SNS | ❌ 未決定 |

**影響範囲:** この決定が `.env` の設定項目、Dockerfile 構成、CI/CD パイプラインの内容に直接影響する。

---

## 2. フロントエンド技術選定

> バックエンド（FastAPI + PostgreSQL + SQLAlchemy）は確定済み。フロントエンドは未選定。

| # | 決定事項 | 候補例 | ステータス |
|---|---------|--------|-----------|
| 2-1 | フレームワーク | React / Vue / Svelte | ❌ 未決定 |
| 2-2 | ビルドツール | Vite / Next.js / Nuxt | ❌ 未決定 |
| 2-3 | UIコンポーネントライブラリ | shadcn/ui / MUI / Vuetify 等 | ❌ 未決定 |
| 2-4 | 状態管理 | Zustand / Pinia / Redux 等 | ❌ 未決定 |
| 2-5 | CSS 方針 | Tailwind CSS / CSS Modules / styled-components 等 | ❌ 未決定 |

**備考:** PWA 対応（プッシュ通知用）が要件にあるため、Service Worker 対応が容易なフレームワーク・ビルドツールを選ぶこと。

---

## 3. 外部サービスアカウント・APIキー取得

> 開発環境で外部API連携をテストするために事前取得が必要。

| # | サービス | 必要なもの | 利用フェーズ | ステータス |
|---|---------|-----------|------------|-----------|
| 3-1 | WeatherAPI.com | APIキー（無料プラン登録） | Phase 5 | ❌ 未取得 |
| 3-2 | Google Gemini API | APIキー（Google AI Studio） | Phase 8 | ❌ 未取得 |
| 3-3 | Firebase プロジェクト | プロジェクト作成 + サービスアカウントキー（FCM用） | Phase 6 | ❌ 未取得 |
| 3-4 | Supabase（DB選定時） | プロジェクト作成 + 接続文字列取得 | Phase 1 | ❌ 未取得 |

**注意:**
- Firebase は iOS プッシュ通知を行う場合、Apple Developer Program（年$99）への登録も必要
- Web プッシュ通知のみであれば Apple Developer Program は不要

---

## 4. OTP2（経路探索サーバー）のホスティング方針

> 参照: `backend/docs/経路探索API設計調査.md`
> 開発タスクでは「Phase 7 直前に決定」としているが、ローカル開発環境でのテスト方針は早期に決めておくべき。

| # | 決定事項 | 候補 | ステータス |
|---|---------|------|-----------|
| 4-1 | ローカル開発時の OTP2 利用方法 | Docker でローカル起動 / 共有開発サーバーに配置 / モック利用 | ❌ 未決定 |
| 4-2 | 本番デプロイ先 | Cloud Run / fly.io / VPS 等（Java ベースのため要メモリ） | ❌ 未決定 |
| 4-3 | GTFS データの更新頻度・方法 | 手動 / 定期バッチ | ❌ 未決定 |

**備考:** OTP2 は Java ベースでメモリ消費が大きい（東京圏 GTFS グラフで 1GB 以上）。無料枠の小さいサービスでは動作しない可能性がある。

---

## 5. 環境変数テンプレート

> `.gitignore` に `.env` が含まれているが、`.env.example` が未作成。
> チーム開発時にどの環境変数を設定すべきか不明な状態。

以下の環境変数を `.env.example` として定義する必要がある（技術選定確定後）:

```bash
# === Database ===
DATABASE_URL=postgresql+asyncpg://user:password@localhost:5432/tenichi

# === Auth (JWT) ===
JWT_SECRET_KEY=your-secret-key-here
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7

# === External APIs ===
WEATHER_API_KEY=your-weatherapi-key
GEMINI_API_KEY=your-gemini-api-key

# === Firebase (FCM) ===
FIREBASE_SERVICE_ACCOUNT_PATH=./firebase-service-account.json

# === OTP2 (Route Search) ===
OTP2_BASE_URL=http://localhost:8080

# === App Settings ===
CORS_ORIGINS=http://localhost:3000
DEBUG=true
```

---

## 6. ローカル開発環境の前提条件

> 開発メンバーが開発環境をセットアップする際に必要なツール。

| ツール | バージョン | 用途 |
|--------|-----------|------|
| Python | 3.11+ | バックエンド |
| Node.js | 20 LTS+ | フロントエンド |
| Docker / Docker Compose | 最新 | ローカル DB・OTP2 |
| PostgreSQL（または Docker） | 15+ | データベース |
| Git | 最新 | バージョン管理 |

---

## 7. その他の確認事項

| # | 項目 | 詳細 | ステータス |
|---|------|------|-----------|
| 7-1 | GitHub Actions CI/CD | `.github/workflows/` が空（`.gitkeep` のみ）。lint + test の自動実行パイプラインを Phase 9 で構築予定 | ⏳ Phase 9 |
| 7-2 | README の充実 | 現在はプロジェクト名のみ。セットアップ手順・API ドキュメントリンクの追記が必要 | ⏳ 実装開始後 |
| 7-3 | ドメイン / URL 設計 | API ベース URL（`/api/v1`）は確定済み。カスタムドメインの要否は要確認 | ❌ 未決定 |
| 7-4 | seed データ | タグは事前定義のみ（Phase 0 A-2 で確定）。seed スクリプトの実装が必要 | ⏳ Phase 4 |

---

## まとめ: Phase 1 着手前の必須アクション

1. **インフラ技術選定を確定する**（§1 の 4 項目）
2. **フロントエンドフレームワークを選定する**（§2）
3. **最低限の外部サービスアカウントを取得する**（§3 の 3-4: DB 接続文字列）
4. **`.env.example` を作成する**（§5 — 技術選定確定後）
5. **ローカル開発環境の前提条件をチームに共有する**（§6）
