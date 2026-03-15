# OTP2 GTFSデータ期限切れ修正（Issue #41）

## 背景
Cloud Run デプロイ後、Routes API で OTP2 との通信は成功するが、経路検索結果が0件で返る問題が発生。
OTP2 の graph.obj に含まれる GTFS データの有効期限（end_date: 20251231）が切れていたことが原因。

## 作業内容

### 1. GTFSデータの確認
- `learn-OpenTripPlanner/data/` 内の全22社GTFSデータの end_date を確認
- 全社 end_date=20261231 に更新済みであることを確認

### 2. graph.obj 再ビルド
- ローカルにJavaがないため、Docker（eclipse-temurin:21-jre）でビルド
- メモリ: Docker 10GB割当、コンテナ8GB、JVMヒープ6GB
- data/ 内の重複サブディレクトリ（GTFS-data, json-data）を退避してビルド成功（39分）
- 出力: graph.obj 710.1MB

### 3. GCSアップロード & Cloud Buildデプロイ
- `gsutil cp` で `gs://schedule-t-y-k-app_cloudbuild/otp2-data/graph.obj` にアップロード
- `gcloud builds submit` で Cloud Build を手動トリガー → デプロイ成功

### 4. ingress問題の発見と暫定対応
- OTP2 の `ingress=internal` では FastAPI バックエンドからアクセスできない問題を発見
- 原因: バックエンドに VPC egress が未設定のため、パブリック経由の通信が internal で拒否される
- 暫定対応: `ingress=all` に変更（IAM認証で保護されているため許容）
- Issue #54 として起票済み

## 実装箇所
- `infra/cloudbuild-otp2.yaml` — `--ingress=internal` → `--ingress=all`
- OTP2 Docker イメージ再ビルド（graph.obj 更新）
- GCS: `gs://schedule-t-y-k-app_cloudbuild/otp2-data/graph.obj` 更新

## テスト結果

### 経路検索API ✅
```bash
curl -X POST ".../api/v1/routes/search" \
  -d '{"origin_lat":35.658,"origin_lon":139.7016,
       "destination_lat":35.6812,"destination_lon":139.7671,
       "travel_mode":"transit","arrival_time":"2026-03-20T09:00:00+09:00"}'
```
→ 渋谷→新宿（埼京線・川越線）→東京（中央線快速）のルートが正常に返却 ✅

## 残課題
- Issue #54: Direct VPC Egress 導入で ingress=internal に戻す（余力があれば対応）
