# GCPインフラアーキテクチャ設計

> **目的:** GCPを使ったインフラ構成を設計し、CI/CDパイプラインを含むアーキテクチャを確定する。
> **作成日:** 2026-03-05
> **前提:** `docs/research/インフラ設計調査.md` の調査結果を踏まえ、GCPでの構築に決定済み。

---

## 1. システム構成の概要

本アプリケーションは以下のサービスで構成される。

| サービス | 技術 | 特性 |
|---------|------|------|
| FastAPI Backend | Python FastAPI | 軽量 BFF、リクエスト駆動、サーバーレス向き |
| OTP2 Server | Java (OpenTripPlanner 2) | 重量級（~4GB RAM）、常時起動必須、GraphQL API |
| Frontend | React/Next.js (TypeScript) | 静的ホスティング可能 |
| Database | Supabase (PostgreSQL) | 外部サービス（決定済み） |
| Push通知 | FCM (Firebase Cloud Messaging) | 外部サービス（決定済み） |

### マルチサービス構成の妥当性

OTP2とFastAPIバックエンドの **2サービス構成が合理的** である。理由:

- **言語/ランタイムが異なる** — OTP2はJava、バックエンドはPython
- **リソース要件が大幅に異なる** — OTP2は常時4GB RAM、バックエンドは512MB程度
- **デプロイ頻度が異なる** — OTP2はGTFSデータ更新時のみ、バックエンドは頻繁にデプロイ
- **障害分離** — 分離することで障害の影響範囲を限定できる

モノリス構成（1サービスに統合）は言語・ランタイムが異なるため技術的に不可能。

---

## 2. アーキテクチャ案の比較

### 案A: Cloud Run マルチサービス構成（推奨）

FastAPIとOTP2の両方をCloud Runにデプロイする。OTP2は`min-instances=1`で常時起動を保証する。

```
┌─────────────────────────────────────────────────────┐
│                    GCP Project                       │
│                                                      │
│  ┌──────────────┐    ┌──────────────────────────┐   │
│  │ Cloud Build   │◄───│ GitHub (Push Trigger)     │   │
│  │ (CI/CD)       │    └──────────────────────────┘   │
│  └──────┬───────┘                                    │
│         │ Build & Deploy                             │
│         ▼                                            │
│  ┌─────────────────┐  ┌─────────────────────────┐   │
│  │ Artifact Registry│  │ Firebase Hosting (CDN)  │   │
│  │ (Container Images)│  │ ┌───────────────────┐  │   │
│  └────────┬────────┘  │ │ Frontend (React)   │  │   │
│           │           │ └───────────────────┘  │   │
│           ▼           └─────────────────────────┘   │
│  ┌────────────────────────────────────────────┐     │
│  │           Cloud Run Services                │     │
│  │                                             │     │
│  │  ┌─────────────────┐  ┌─────────────────┐  │     │
│  │  │ fastapi-backend  │  │ otp2-server     │  │     │
│  │  │ (min=0, max=10)  │  │ (min=1, max=2)  │  │     │
│  │  │ 512MB / 1vCPU    │  │ 4GB / 2vCPU     │  │     │
│  │  │ Port: 8000       │  │ Port: 8080      │  │     │
│  │  └────────┬─────────┘  └────────▲────────┘  │     │
│  │           │  Internal HTTP call  │           │     │
│  │           └──────────────────────┘           │     │
│  └────────────────────────────────────────────┘     │
│                                                      │
│  ┌─────────────┐  ┌─────────────┐                   │
│  │ Secret Mgr  │  │ Cloud        │                   │
│  │ (API Keys)  │  │ Logging/     │                   │
│  │             │  │ Monitoring   │                   │
│  └─────────────┘  └─────────────┘                   │
└─────────────────────────────────────────────────────┘
         │                    │
         ▼                    ▼
  ┌──────────────┐   ┌──────────────┐
  │ Supabase     │   │ External APIs│
  │ (PostgreSQL) │   │ Weather/     │
  │              │   │ Gemini       │
  └──────────────┘   └──────────────┘
```

#### サービス詳細

| サービス | 実行環境 | CPU / Memory | min / max instances | 公開範囲 |
|---------|---------|------------|-------------------|---------|
| fastapi-backend | Cloud Run | 1 vCPU / 512MB | 0〜10 | 外部公開（HTTPS） |
| otp2-server | Cloud Run | 2 vCPU / 4GB | **1**〜2 | 内部のみ |
| frontend | Firebase Hosting | N/A (CDN) | N/A | 外部公開（HTTPS） |

#### CI/CD パイプライン

```
GitHub Push (main branch)
    │
    ├─► Cloud Build Trigger (backend)
    │     1. docker build fastapi-backend
    │     2. push to Artifact Registry
    │     3. gcloud run deploy fastapi-backend
    │
    ├─► Cloud Build Trigger (otp2)
    │     1. docker build otp2-server (graph.obj込み)
    │     2. push to Artifact Registry
    │     3. gcloud run deploy otp2-server
    │
    └─► GitHub Actions or Cloud Build (frontend)
          1. npm run build
          2. firebase deploy --only hosting
```

#### コスト見積もり（月額）

| 項目 | 料金 | 備考 |
|------|------|------|
| Cloud Run (FastAPI) | ~$0 | 無料枠内（200万リクエスト/月） |
| Cloud Run (OTP2, min=1) | **~$30-50** | 4GB RAM × 1インスタンス常時起動 |
| Artifact Registry | ~$1 | ストレージ料金のみ |
| Cloud Build | ~$0 | 120分/日の無料枠内 |
| Firebase Hosting | ~$0 | 無料枠内 |
| Secret Manager | ~$0 | 少数のシークレット |
| **合計** | **~$30-50/月** | |

#### メリット

- GCPサービスで統一されており管理がシンプル
- Cloud Run間の内部通信はVPCコネクタ不要（サービス間呼び出しで通信可能）
- OTP2もコンテナ化するため、再現性が高い
- スケーリングが自動（FastAPIはゼロスケール可能）
- Cloud Build + GitHub連携でCI/CDが簡単
- Artifact Registryでイメージの一元管理
- Cloud Logging / Monitoring で統合的な監視

#### デメリット

- OTP2の常時起動コスト（min=1）が固定費として発生（~$30-50/月）
- OTP2のコンテナイメージが大きい（graph.obj 709MB含む）ためビルド・プッシュに時間がかかる
- Cloud Runのリクエストタイムアウト（最大60分）に注意が必要

---

### 案B: Cloud Run + Compute Engine ハイブリッド構成

FastAPIはCloud Run（サーバーレス）、OTP2はGCE VM（常時起動）に配置する。

```
┌─────────────────────────────────────────────────────┐
│                    GCP Project                       │
│                                                      │
│  ┌──────────────────────────────────────────────┐   │
│  │              VPC Network                      │   │
│  │                                               │   │
│  │  ┌─────────────────┐  ┌───────────────────┐  │   │
│  │  │ Cloud Run        │  │ GCE VM (e2-medium)│  │   │
│  │  │ fastapi-backend  │  │ otp2-server       │  │   │
│  │  │ (min=0, max=10)  │  │ 4GB RAM / 2vCPU   │  │   │
│  │  │ Port: 8000       │  │ Port: 8080        │  │   │
│  │  └────────┬─────────┘  └────────▲──────────┘  │   │
│  │           │  VPC Connector       │             │   │
│  │           └──────────────────────┘             │   │
│  └──────────────────────────────────────────────┘   │
│                                                      │
│  ┌──────────────┐    ┌──────────────────────────┐   │
│  │ Cloud Build   │◄───│ GitHub (Push Trigger)     │   │
│  └──────────────┘    └──────────────────────────┘   │
│                                                      │
│  ┌──────────────────────────┐                       │
│  │ Firebase Hosting (CDN)   │                       │
│  │ Frontend (React)         │                       │
│  └──────────────────────────┘                       │
└─────────────────────────────────────────────────────┘
```

#### サービス詳細

| サービス | 実行環境 | スペック | 備考 |
|---------|---------|---------|------|
| fastapi-backend | Cloud Run | 1 vCPU / 512MB | サーバーレス、ゼロスケール |
| otp2-server | GCE (e2-medium) | 2 vCPU / 4GB | 常時起動VM、内部IPのみ |
| frontend | Firebase Hosting | CDN | 静的ホスティング |

#### CI/CD パイプライン

```
GitHub Push
    │
    ├─► Cloud Build (backend)
    │     → Artifact Registry → Cloud Run deploy
    │
    ├─► Cloud Build (otp2)
    │     → docker build → push to Artifact Registry
    │     → SSH into GCE → docker pull & restart
    │
    └─► GitHub Actions (frontend)
          → npm build → firebase deploy
```

#### コスト見積もり（月額）

| 項目 | 料金 | 備考 |
|------|------|------|
| Cloud Run (FastAPI) | ~$0 | 無料枠内 |
| GCE e2-medium (OTP2) | **~$25** | 2vCPU / 4GB、常時起動 |
| VPC Connector | ~$7 | Cloud Run → GCE通信用 |
| Artifact Registry | ~$1 | |
| Cloud Build | ~$0 | 無料枠内 |
| Firebase Hosting | ~$0 | |
| **合計** | **~$33/月** | |

#### メリット

- OTP2のコストが案Aより安定（VMの固定料金で予測しやすい）
- GCEはspot VMにすることでさらにコスト削減可能（~$8/月）
- OTP2のグラフファイルをディスクに永続化できる（起動時間短縮）
- GCEにSSHしてデバッグが容易
- FastAPIはサーバーレスのまま維持

#### デメリット

- VPC Connectorの追加コスト（~$7/月）
- GCEのOS/ランタイムの管理が必要（セキュリティパッチ等）
- OTP2のCI/CDが案Aよりやや複雑（SSH or MIG操作が必要）
- インフラ構成の統一感がない（Cloud Run + GCEの混在）
- GCEの自動復旧設定（startup script, health check）の追加設定が必要

---

### 案C: GKE Autopilot 構成

両サービスをGKE Autopilotクラスタ上のKubernetes Podとしてデプロイする。

```
┌─────────────────────────────────────────────────────┐
│                    GCP Project                       │
│                                                      │
│  ┌──────────────────────────────────────────────┐   │
│  │           GKE Autopilot Cluster               │   │
│  │                                               │   │
│  │  ┌─────────────────────────────────────────┐  │   │
│  │  │         Ingress Controller               │  │   │
│  │  │  /api/* → fastapi-backend               │  │   │
│  │  └─────────────────┬───────────────────────┘  │   │
│  │                    │                           │   │
│  │  ┌────────────────┐ ┌────────────────────┐    │   │
│  │  │ Deployment      │ │ Deployment          │    │   │
│  │  │ fastapi-backend │ │ otp2-server         │    │   │
│  │  │ replicas: 1-5   │ │ replicas: 1          │    │   │
│  │  │ 500m/512Mi      │ │ 2000m/4Gi            │    │   │
│  │  │ HPA enabled     │ │ No autoscale         │    │   │
│  │  └────────────────┘ └────────────────────┘    │   │
│  │                                               │   │
│  │  ┌────────────────────────────────────────┐   │   │
│  │  │ Kubernetes Services                     │   │   │
│  │  │ - fastapi-svc (ClusterIP + Ingress)    │   │   │
│  │  │ - otp2-svc (ClusterIP, internal only)  │   │   │
│  │  └────────────────────────────────────────┘   │   │
│  └──────────────────────────────────────────────┘   │
│                                                      │
│  ┌──────────────────────────┐                       │
│  │ Firebase Hosting (CDN)   │                       │
│  │ Frontend (React)         │                       │
│  └──────────────────────────┘                       │
│                                                      │
│  ┌──────────────┐    ┌──────────────────────────┐   │
│  │ Cloud Build   │◄───│ GitHub (Push Trigger)     │   │
│  └──────────────┘    └──────────────────────────┘   │
└─────────────────────────────────────────────────────┘
```

#### CI/CD パイプライン

```
GitHub Push
    │
    ├─► Cloud Build
    │     1. docker build (fastapi / otp2)
    │     2. push to Artifact Registry
    │     3. kubectl apply -f k8s/
    │     4. kubectl rollout status
    │
    └─► GitHub Actions (frontend)
          → npm build → firebase deploy
```

#### コスト見積もり（月額）

| 項目 | 料金 | 備考 |
|------|------|------|
| GKE Autopilot (管理費) | ~$74 | クラスタ管理費 $0.10/hr |
| Pod: FastAPI | ~$10 | 0.5vCPU / 512MB × 常時1Pod |
| Pod: OTP2 | ~$30 | 2vCPU / 4GB × 常時1Pod |
| Ingress (Load Balancer) | ~$18 | |
| Artifact Registry | ~$1 | |
| Firebase Hosting | ~$0 | |
| **合計** | **~$130/月** | |

#### メリット

- Kubernetesによるサービスオーケストレーションが強力
- サービス間通信がCluster内DNSで簡単（`http://otp2-svc:8080`）
- HPA (Horizontal Pod Autoscaler) によるきめ細かなスケーリング
- 将来サービスを追加する場合に拡張しやすい
- ヘルスチェック・自動復旧が標準装備
- Kubernetesのエコシステム（Helm, Kustomize, ArgoCD等）が使える

#### デメリット

- **コストが最も高い**（クラスタ管理費だけで$74/月）
- Kubernetesの学習コストが高い
- ハッカソン規模ではオーバーエンジニアリング
- マニフェスト（Deployment, Service, Ingress等）の管理が必要
- デバッグがCloud Runよりも複雑

---

## 3. 比較サマリー

| 項目 | 案A: Cloud Run マルチ | 案B: Cloud Run + GCE | 案C: GKE Autopilot |
|------|---------------------|---------------------|-------------------|
| **月額コスト** | ~$30-50 | ~$33 | ~$130 |
| **セットアップ難度** | 中 | 中〜高 | 高 |
| **CI/CD統一性** | 高（全てCloud Run） | 中（GCEデプロイが別） | 高（kubectl一本） |
| **運用負荷** | 低 | 中（GCE管理） | 中（K8s運用） |
| **スケーラビリティ** | 高 | 中 | 最高 |
| **サービス間通信** | 簡単（Cloud Run URL） | 要VPC Connector | 最も簡単（内部DNS） |
| **将来の拡張性** | 高 | 中 | 最高 |
| **ハッカソン向き度** | ★★★★★ | ★★★☆☆ | ★★☆☆☆ |

---

## 4. 推奨: 案A（Cloud Run マルチサービス構成）

### 推奨理由

1. **コストと機能のバランスが最良** — OTP2常時起動でも$30-50/月
2. **CI/CDが統一的** — Cloud Buildで全サービスを同じパイプラインで管理
3. **運用負荷が最小** — フルマネージドでOS管理不要
4. **ハッカソンの速度に適合** — Dockerfile + cloudbuild.yaml だけで済む
5. **将来的な拡張も可能** — サービス追加もCloud Runを追加するだけ

---

## 5. 共通インフラ要素

### Secret Management

| シークレット | 用途 |
|-------------|------|
| `SUPABASE_URL` | Supabase接続URL |
| `SUPABASE_KEY` | Supabase APIキー |
| `JWT_SECRET` | JWT署名キー |
| `WEATHERAPI_KEY` | WeatherAPI.comのAPIキー |
| `OTP2_GRAPHQL_URL` | OTP2のGraphQLエンドポイント（内部URL） |
| `GCP_PROJECT_ID` | GCPプロジェクトID（Vertex AI用、環境変数） |
| `GCP_LOCATION` | GCPリージョン（環境変数、デフォルト: asia-northeast1） |

Cloud Run + Secret Manager を使用し、シークレットを環境変数としてコンテナに注入する。
`GCP_PROJECT_ID` / `GCP_LOCATION` はシークレットではなく通常の環境変数として設定する。

### Monitoring / Logging

- **Cloud Logging** — 全サービスのログを自動収集（Cloud Run標準）
- **Cloud Monitoring** — CPU/メモリ/リクエスト数のダッシュボード
- **アラート** — OTP2のメモリ使用率80%超過時にアラート設定

### ネットワーク

- FastAPIは外部公開（`--ingress all`）
- OTP2は内部のみ（`--ingress internal`）
- FastAPIからOTP2へはCloud RunのサービスURLで内部通信
- VPC Connectorは不要（Cloud Run間の通信はサービスURL経由）

---

## 6. OTP2 デプロイ仕様

### コンテナイメージ

- ベースイメージ: `eclipse-temurin:21-jre`
- graph.obj（709MB）をイメージに焼き込む
- OTP2 JAR（~100MB）をイメージに含む
- 合計イメージサイズ: ~1GB

### Cloud Run 設定

```
gcloud run deploy otp2-server \
  --image REGION-docker.pkg.dev/PROJECT_ID/app/otp2-server:TAG \
  --region asia-northeast1 \
  --memory 4Gi \
  --cpu 2 \
  --min-instances 1 \
  --max-instances 2 \
  --port 8080 \
  --ingress internal \
  --no-allow-unauthenticated \
  --timeout 300
```

### ヘルスチェック

OTP2は `/otp/actuators/health` エンドポイントでヘルスチェックが可能。
Cloud Runのstartup probeで使用する。

---

## 参考ドキュメント

- `docs/research/インフラ設計調査.md` — デプロイ先・DB・プッシュ通知の技術選定調査
- `backend/docs/spec/経路探索API設計.md` — OTP2 の API設計・GraphQL クエリ設計
- `docs/research/api/外部経路探索API調査.md` — OTP2 セットアップ手順・GTFS状況
