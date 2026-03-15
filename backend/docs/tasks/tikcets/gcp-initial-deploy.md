# GCP 初回デプロイ

## 背景
ハッカソンのデモに向けて、FastAPI Backend と OTP2 Server を GCP Cloud Run にデプロイする必要があった。
インフラ構築手順書（`infra/docs/インフラ構築手順書.md`）の §1〜§8 を実施。

## 作業内容

### 1. GCP基盤セットアップ（§1〜§5）
- GCPプロジェクト `schedule-t-y-k-app` のセットアップ確認
- 5つのAPI有効化（Cloud Run, Cloud Build, Artifact Registry, Secret Manager, Vertex AI）
- サービスアカウント作成（fastapi-sa, otp2-sa）+ IAM権限付与
- Artifact Registry `app` リポジトリ作成
- Secret Manager に6つのシークレット作成:
  - SUPABASE_URL, SUPABASE_KEY, JWT_SECRET, WEATHERAPI_KEY, OTP2_GRAPHQL_URL, DATABASE_URL

### 2. FastAPI Backend デプロイ（§6）
- Cloud Buildでイメージビルド＆Artifact Registryにプッシュ
- Cloud Run にデプロイ（512Mi/1CPU, ENVIRONMENT=production）
- Supabase PostgreSQL に Alembic マイグレーション実行

### 3. OTP2 Server デプロイ（§7）
- git lfs pull で graph.obj (677MB) をダウンロード
- Cloud Buildでイメージビルド＆プッシュ
- Cloud Run にデプロイ（**6Gi**/2CPU — 4Giではメモリ不足）
- startup-probe 設定（failureThreshold=30, 約330秒の猶予）

### 4. サービス間通信設定（§8）
- OTP2の内部URLをSecret Managerに設定
- fastapi-sa に OTP2 invoker 権限付与
- FastAPI 再デプロイ

## 実装箇所（コード修正）
- `backend/alembic/env.py` — DATABASE_URL の `%` エスケープ修正（ConfigParser互換性）
- `backend/app/services/otp2_client.py` — IDトークンの audience をベースURL（パスなし）に修正
- `infra/cloudbuild-backend.yaml` — DATABASE_URL シークレット追加、ENVIRONMENT=production 追加

## デプロイ中に発覚した問題と対応
| 問題 | 原因 | 対応 |
|------|------|------|
| OTP2 デプロイ失敗（メモリ不足） | 4GiではJVMヒープ3G+オーバーヘッドが収まらない | 6Giに増量 |
| FastAPI register 500エラー | DATABASE_URLが未設定 | Secret Managerに追加 |
| FastAPI register テーブルなしエラー | Alembicマイグレーション未実行 | Dockerコンテナ経由でマイグレーション実行 |
| Alembic `%` エスケープエラー | ConfigParserが `%` を特殊文字として解釈 | `.replace("%", "%%")` 修正 |
| OTP2 404エラー（Page not found） | Cloud Run `internal` ingress でfastapi→OTP2通信が到達不可 | `ingress=all` に変更 |
| OTP2 IDトークン認証エラー | audience にパス付きURLを渡していた | ベースURLのみに修正 |

## テスト結果
41エンドポイントをcurlでテスト:
- **39/41 成功** ✅
- Routes API (2件): OTP2通信成功、GTFSデータ期限切れで結果なし ⚠️
- Suggestions API (2件): Vertex AI (Gemini) NotFoundエラー ⚠️

## 残課題
- GTFSデータ更新（経路探索で結果が返るようにする）
- Vertex AI Gemini モデルのアクセス権限確認
- OTP2 ingress を `internal` に戻す（VPCコネクタ設定等の検討）
- Cloud Build CI/CDトリガー作成（§9）
