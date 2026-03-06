# CI/CD パイプライン設計

> **構成:** 案A — Cloud Run マルチサービス構成（確定）
> **クライアント:** iOS アプリ（React Native）— CI/CD対象外
> **更新日:** 2026-03-05

---

## 1. パイプライン概要

### 対象サービス

| サービス | CI/CDツール | トリガー条件 | 構成ファイル |
|---------|-----------|------------|------------|
| fastapi-backend | Cloud Build | `backend/**` へのpush (main) | `infra/cloudbuild-backend.yaml` |
| otp2-server | Cloud Build | `otp2/**` へのpush (main) | `infra/cloudbuild-otp2.yaml` |
| iOS App | **対象外** | Xcode / EAS Build で管理 | — |

### パイプラインフロー

```
GitHub (main branch)
    │
    ├─► Cloud Build Trigger: deploy-fastapi-backend
    │     対象: backend/** の変更
    │     1. docker build ./backend
    │     2. docker push → Artifact Registry
    │     3. gcloud run deploy fastapi-backend
    │     所要時間: ~2-3分
    │
    └─► Cloud Build Trigger: deploy-otp2-server
          対象: otp2/** の変更
          1. docker build ./otp2 (graph.obj ~709MB含む)
          2. docker push → Artifact Registry
          3. gcloud run deploy otp2-server
          所要時間: ~10-15分（イメージが大きいため）
```

---

## 2. Cloud Build トリガー設定

### 2.1 backend トリガー

| 項目 | 値 |
|------|-----|
| トリガー名 | `deploy-fastapi-backend` |
| イベントタイプ | ブランチへのプッシュ |
| ソース | GitHub リポジトリ (main ブランチ) |
| ファイルフィルタ（含む） | `backend/**` |
| Cloud Build構成ファイル | `infra/cloudbuild-backend.yaml` |
| サービスアカウント | デフォルト Cloud Build SA |

### 2.2 otp2 トリガー

| 項目 | 値 |
|------|-----|
| トリガー名 | `deploy-otp2-server` |
| イベントタイプ | ブランチへのプッシュ |
| ソース | GitHub リポジトリ (main ブランチ) |
| ファイルフィルタ（含む） | `otp2/**` |
| Cloud Build構成ファイル | `infra/cloudbuild-otp2.yaml` |
| サービスアカウント | デフォルト Cloud Build SA |
| タイムアウト | 1800秒（30分） |

---

## 3. cloudbuild-backend.yaml 詳細

**ファイル:** `infra/cloudbuild-backend.yaml`

```yaml
steps:
  # Step 1: Docker イメージをビルド
  - name: 'gcr.io/cloud-builders/docker'
    args:
      - 'build'
      - '-t'
      - 'asia-northeast1-docker.pkg.dev/$PROJECT_ID/app/fastapi-backend:$COMMIT_SHA'
      - '-t'
      - 'asia-northeast1-docker.pkg.dev/$PROJECT_ID/app/fastapi-backend:latest'
      - './backend'

  # Step 2: Artifact Registry にプッシュ
  - name: 'gcr.io/cloud-builders/docker'
    args:
      - 'push'
      - '--all-tags'
      - 'asia-northeast1-docker.pkg.dev/$PROJECT_ID/app/fastapi-backend'

  # Step 3: Cloud Run にデプロイ
  - name: 'gcr.io/google.com/cloudsdktool/cloud-sdk'
    entrypoint: gcloud
    args:
      - 'run'
      - 'deploy'
      - 'fastapi-backend'
      - '--image=asia-northeast1-docker.pkg.dev/$PROJECT_ID/app/fastapi-backend:$COMMIT_SHA'
      - '--region=asia-northeast1'
      - '--memory=512Mi'
      - '--cpu=1'
      - '--min-instances=0'
      - '--max-instances=10'
      - '--port=8000'
      - '--ingress=all'
      - '--allow-unauthenticated'
      - '--set-secrets=SUPABASE_URL=SUPABASE_URL:latest,SUPABASE_KEY=SUPABASE_KEY:latest,JWT_SECRET=JWT_SECRET:latest,WEATHERAPI_KEY=WEATHERAPI_KEY:latest,GEMINI_API_KEY=GEMINI_API_KEY:latest,OTP2_GRAPHQL_URL=OTP2_GRAPHQL_URL:latest'
      - '--service-account=fastapi-sa@$PROJECT_ID.iam.gserviceaccount.com'
      - '--timeout=60'

images:
  - 'asia-northeast1-docker.pkg.dev/$PROJECT_ID/app/fastapi-backend:$COMMIT_SHA'
  - 'asia-northeast1-docker.pkg.dev/$PROJECT_ID/app/fastapi-backend:latest'

timeout: '600s'

options:
  logging: CLOUD_LOGGING_ONLY
```

### ポイント

- `$COMMIT_SHA` タグでイミュータブルなイメージ管理
- `latest` タグも付与（手動参照用）
- `--set-secrets` で Secret Manager から環境変数を注入
- `--service-account` でカスタム SA を指定
- タイムアウト 600秒（10分）で十分

---

## 4. cloudbuild-otp2.yaml 詳細

**ファイル:** `infra/cloudbuild-otp2.yaml`

```yaml
steps:
  # Step 1: Docker イメージをビルド（graph.obj含むため大きい）
  - name: 'gcr.io/cloud-builders/docker'
    args:
      - 'build'
      - '-t'
      - 'asia-northeast1-docker.pkg.dev/$PROJECT_ID/app/otp2-server:$COMMIT_SHA'
      - '-t'
      - 'asia-northeast1-docker.pkg.dev/$PROJECT_ID/app/otp2-server:latest'
      - './otp2'
    timeout: '900s'

  # Step 2: Artifact Registry にプッシュ
  - name: 'gcr.io/cloud-builders/docker'
    args:
      - 'push'
      - '--all-tags'
      - 'asia-northeast1-docker.pkg.dev/$PROJECT_ID/app/otp2-server'
    timeout: '600s'

  # Step 3: Cloud Run にデプロイ
  - name: 'gcr.io/google.com/cloudsdktool/cloud-sdk'
    entrypoint: gcloud
    args:
      - 'run'
      - 'deploy'
      - 'otp2-server'
      - '--image=asia-northeast1-docker.pkg.dev/$PROJECT_ID/app/otp2-server:$COMMIT_SHA'
      - '--region=asia-northeast1'
      - '--memory=4Gi'
      - '--cpu=2'
      - '--min-instances=1'
      - '--max-instances=2'
      - '--port=8080'
      - '--ingress=internal'
      - '--no-allow-unauthenticated'
      - '--service-account=otp2-sa@$PROJECT_ID.iam.gserviceaccount.com'
      - '--timeout=300'

images:
  - 'asia-northeast1-docker.pkg.dev/$PROJECT_ID/app/otp2-server:$COMMIT_SHA'
  - 'asia-northeast1-docker.pkg.dev/$PROJECT_ID/app/otp2-server:latest'

timeout: '1800s'  # 30分（ビルド+プッシュに時間がかかるため）

options:
  logging: CLOUD_LOGGING_ONLY
  machineType: 'E2_HIGHCPU_8'  # ビルド高速化のためハイスペックマシン使用
```

### ポイント

- **タイムアウト 1800秒（30分）**: graph.obj (~709MB) を含むイメージビルド・プッシュに時間がかかるため
- **`E2_HIGHCPU_8`**: ビルド高速化のためハイスペックマシンを使用（無料枠を超える場合は `E2_MEDIUM` に変更）
- `--ingress=internal`: 外部アクセス不可
- `--no-allow-unauthenticated`: IAM認証必須
- `--min-instances=1`: 常時起動を保証

---

## 5. ブランチ戦略

```
main ─────────────────────────────────── 本番環境（Cloud Build自動デプロイ）
  │
  └── feature/* ─────────────────────── 機能開発（CI/CDトリガーなし）
```

| ブランチ | CI/CD | 用途 |
|---------|-------|------|
| `main` | Cloud Build 自動デプロイ | 本番環境 |
| `feature/*` | なし | 機能開発ブランチ |

**ハッカソン規模のため、シンプルなブランチ戦略を採用:**
- `main` への push で自動デプロイ
- staging/develop 環境は不要（必要時に追加可能）
- Pull Request のマージで main にデプロイ

---

## 6. ロールバック手順

### 方法1: Cloud Run リビジョン切り替え（推奨・最速）

```bash
# 現在のリビジョン一覧を確認
gcloud run revisions list --service=fastapi-backend --region=asia-northeast1

# 特定のリビジョンにトラフィックを100%切り替え
gcloud run services update-traffic fastapi-backend \
  --region=asia-northeast1 \
  --to-revisions=fastapi-backend-REVISION_ID=100
```

所要時間: **数秒**（既存リビジョンへのルーティング変更のみ）

### 方法2: 過去イメージの再デプロイ

```bash
# Artifact Registry のイメージ一覧
gcloud artifacts docker images list \
  asia-northeast1-docker.pkg.dev/PROJECT_ID/app/fastapi-backend

# 特定のコミットSHAのイメージで再デプロイ
gcloud run deploy fastapi-backend \
  --image=asia-northeast1-docker.pkg.dev/PROJECT_ID/app/fastapi-backend:COMMIT_SHA \
  --region=asia-northeast1
```

所要時間: **1-2分**（新リビジョン作成）

### 方法3: git revert + 自動デプロイ

```bash
# 問題のコミットを revert
git revert HEAD
git push origin main
# Cloud Build が自動でデプロイ
```

所要時間: **2-5分**（ビルド+デプロイ）

---

## 7. ビルド最適化

### Docker レイヤーキャッシュ

**backend/Dockerfile** は既に最適化済み:
1. `requirements.txt` を先にコピー → 依存関係インストール
2. アプリコードを最後にコピー
3. コード変更時は依存関係レイヤーがキャッシュされる

### OTP2 ビルドの注意点

- `graph.obj` (~709MB) は変更頻度が低いため、Dockerfile のレイヤー順序で先にコピー
- GTFS データ更新時のみ graph.obj が変わり、フルリビルドが必要
- Cloud Build の `machineType: E2_HIGHCPU_8` でビルド時間を短縮

### Artifact Registry クリーンアップ

古いイメージの自動削除を設定:

```bash
# 30日以上前のイメージを削除するクリーンアップポリシー
gcloud artifacts repositories set-cleanup-policies app \
  --project=PROJECT_ID \
  --location=asia-northeast1 \
  --policy=infra/cleanup-policy.json
```
