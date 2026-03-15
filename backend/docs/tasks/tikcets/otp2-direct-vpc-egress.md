# OTP2 Direct VPC Egress 導入（Issue #54）

## 背景
OTP2 Cloud Run の `ingress=internal` 設定時、FastAPI バックエンドからのリクエストが GFE 404 で拒否される。
バックエンドに VPC egress が未設定のため、OTP2 へのリクエストがパブリック経由となり internal でブロックされる。
現在は暫定対応として `ingress=all`（IAM認証あり）で運用中。

## 作業内容

### 1. Direct VPC Egress の設定
FastAPI バックエンドの Cloud Run サービスに Direct VPC Egress を設定する。
VPC Connector と異なり追加コンピュートコスト不要、同一リージョン内通信は無料。

```bash
# バックエンドに Direct VPC egress を設定
gcloud run services update fastapi-backend \
  --region=asia-northeast1 \
  --network=default \
  --subnet=default \
  --vpc-egress=private-ranges-only
```

### 2. OTP2 の ingress を internal に戻す
```bash
gcloud run services update otp2-server \
  --region=asia-northeast1 \
  --ingress=internal
```

### 3. cloudbuild-otp2.yaml の修正
`--ingress=all` → `--ingress=internal` に戻す

### 4. cloudbuild-backend.yaml の修正
Direct VPC egress の設定を追加:
```yaml
- '--network=default'
- '--subnet=default'
- '--vpc-egress=private-ranges-only'
```

## 実装箇所
- `infra/cloudbuild-backend.yaml` — Direct VPC egress パラメータ追加
- `infra/cloudbuild-otp2.yaml` — `--ingress=all` → `--ingress=internal`

## テスト方法
1. バックエンドに Direct VPC egress 設定後、OTP2 を ingress=internal に戻す
2. 経路検索 API (`POST /api/v1/routes/search`) で結果が返ることを確認
3. OTP2 にパブリックからアクセスできないことを確認（403/404）

## 参考
- [Direct VPC egress ドキュメント](https://docs.google.com/run/docs/configuring/vpc-direct-vpc)
- [VPC Connector との比較](https://docs.google.com/run/docs/configuring/connecting-vpc)
