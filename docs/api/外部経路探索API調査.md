# 外部経路探索API調査

## 1. 概要

Routes フェーズ（Phase 7）の実装ブロッカーとなっている経路探索 API の選定調査。

`api仕様.md § 1. 外部API選定` で「経路（電車）」「経路（徒歩・車）」の API が未選定のまま。
`API詳細設計.md § Routes` は外部 API 依存のためレスポンス設計を保留中。

### 調査状況サマリー

| 候補 | 状況 |
|------|------|
| **OTP2 (OpenTripPlanner 2)** | 調査済み。技術的に全要件に対応可能と確認。セットアップは未実施 |
| **Google Routes API v2** | 検証済み。東京エリアの TRANSIT モードが動作しないことを確認 |
| **Yahoo! 乗換案内 API** | 未調査 |
| **Navitime Route API** | 未調査 |
| **OpenRouteService** | 概要のみ確認。徒歩・車のみ対応（電車非対応） |

---

## 2. 確定させておくべき事項（意思決定チェックリスト）

| 決定事項 | 現状 | 影響範囲 |
|---------|------|---------|
| `transit`（電車）モードをハッカソンスコープに含めるか | **未定** | 含めない場合は API 選定が大幅シンプルになる（徒歩・車のみなら OpenRouteService 等で足りる） |
| OTP2（セルフホスト）と商用 API どちらを採用するか | **未定** | セルフホストはセットアップコストあり（JAR・グラフビルド等）、商用は費用・利用制限あり |
| `arrival_time` 逆算（`POST /routes/departure-time`）を実装するか | **未定** | OTP2 は `arriveBy` / `latestArrival` パラメータで対応可。商用 API は対応差あり |
| 費用上限（無料枠のみか、有料プランを許容するか） | **未定** | API 選択肢を絞る重要な制約 |

---

## 3. 調査対象 API 候補（一覧）

| API | 種別 | 電車対応（東京） | 調査状況 |
|-----|------|----------------|---------|
| OTP2 (OpenTripPlanner 2) | OSS・セルフホスト | ✅ | 調査済み |
| Google Routes API v2 | 商用 | ❌（東京 transit 不可） | 検証済み |
| Yahoo! 乗換案内 API | 商用 | 未調査 | 未調査 |
| Navitime Route API | 商用 | 未調査 | 未調査 |
| OpenRouteService | OSS / SaaS | ❌（徒歩・車のみ） | 概要のみ |

---

## 4. 各 API 詳細

### 4.1 OTP2（OpenTripPlanner 2）

**調査日**: 2026-02-23
**調査ドキュメント**: `../learn-OpenTripPlanner/OTP2-investigation-report.md`

#### 概要

Java ベースのオープンソース（LGPL）マルチモーダル経路探索エンジン。
GraphQL API のみ対応（REST API は v2 で廃止）。

#### ライセンス・費用

- ライセンス: LGPL（完全無料 OSS）
- API コスト: ゼロ（リクエスト課金なし。サーバーインフラ費用のみ）

#### 技術要件

- Java 17 以上
- グラフビルド時メモリ 4GB 以上（推奨）
- ストレージ: グラフファイル（`graph.obj`）で数 GB

#### 対応路線

TrainGTFSGenerator を使用した場合、首都圏 22 事業者に対応：

- JR東日本（山手線・中央線・京浜東北線など 49 路線）
- 東京メトロ（10 路線）
- 都営（地下鉄・荒川線・日暮里舎人ライナーなど 6 路線）
- 東急・小田急・京王・西武・東武・京急・京成・相鉄
- 横浜市営地下鉄・つくばエクスプレス・多摩モノレール・ゆりかもめ 等

#### 対応機能

| 機能 | 対応状況 | 詳細 |
|------|---------|------|
| 到着時刻指定（逆方向探索） | ✅ | `arriveBy: true`（`plan` クエリ）または `latestArrival`（`planConnection` クエリ、v2.7.0 以降推奨） |
| 乗換案内（路線名・乗換駅） | ✅ | `Leg.route.shortName` / `Leg.from.name` / `Leg.to.name` で取得可 |
| 最寄駅の発車時刻 | ✅ | `stopCalls` フィールドで各停車駅の発着時刻を取得可 |
| 直通運転対応 | ✅ | `block_id` サポート・`Leg.interlineWithPreviousLeg` で識別可 |
| リアルタイム遅延情報 | ✅ | GTFS-RT 対応（別途 RT フィード設定が必要） |
| Geocoding（住所→座標） | ❌ | OTP2 自体は対応しない。別途 OSM Nominatim 等が必要 |

#### GTFS データ状況

- **生成済み**: `learn-OpenTripPlanner/data/GTFS-data/` に TrainGTFSGenerator で生成済み
- **問題あり**: end_date が `2025-12-31` で**有効期限切れ**（現在 2026-03-01）
- **未解決**: `Keio-Train.gtfs.zip` が未生成（京王線を含む経路が検索できない）

#### セットアップに必要なもの（未実施）

| リソース | 説明 | サイズ |
|---------|------|--------|
| OTP2 JAR | `otp-2.7.0-shaded.jar` | 約 150MB |
| OSM PBF | `kanto-latest.osm.pbf`（Geofabrik） | 約 700MB |
| build-config.json | グラフビルド設定 | 数行 |
| router-config.json | ルーティング設定（歩行速度・乗り換え猶予時間等） | 数行 |
| グラフビルド実行 | `java -Xmx4G -jar otp.jar --build --save data/`（20〜40 分） | - |

---

### 4.2 Google Routes API v2

**検証日**: 2026-02-23
**結論**: **採用非推奨**

#### 検証結果

| テスト | 結果 |
|--------|------|
| 東京 DRIVE モード | ✅ 正常動作 |
| 東京 TRANSIT モード | ❌ レスポンス 29 バイト、ルートデータなし（空レスポンス） |
| SF TRANSIT モード | ✅ 14KB の正常データを返す |

東京エリアでの TRANSIT モードが空レスポンスを返す現象は Google Issue Tracker **#35826181** で報告されている既知の問題。
**Google Routes API v2 では東京エリアの電車経路検索は実質不可能**。

#### 費用・制限

- 無料枠: $200/月分（クレジット）
- API キー必要
- 電車経路（東京）は使用不可

---

### 4.3 Yahoo! 乗換案内 API

**調査状況**: 未調査

| 項目 | 内容 |
|------|------|
| 無料枠 | 未調査 |
| API キー | 未調査 |
| 電車対応（東京） | 未調査 |
| arriveBy 対応 | 未調査 |
| 商用利用 | 未調査 |
| セットアップコスト | 未調査 |

---

### 4.4 Navitime Route API

**調査状況**: 未調査

| 項目 | 内容 |
|------|------|
| 無料枠 | 未調査 |
| API キー | 未調査 |
| 電車対応（東京） | 未調査 |
| arriveBy 対応 | 未調査 |
| 商用利用 | 未調査 |
| セットアップコスト | 未調査 |

---

### 4.5 OpenRouteService

**調査状況**: 概要のみ

| 項目 | 内容 |
|------|------|
| 無料枠 | 無料（セルフホスト） |
| API キー | 不要（セルフホスト） |
| 電車対応 | ❌ 徒歩・車・自転車のみ |
| arriveBy 対応 | ❌ |
| 商用利用 | 可 |
| セットアップコスト | 中（OSM PBF・Docker 環境） |

電車経路が不要な場合（徒歩・車のみ）は有力な選択肢。

---

## 5. 比較表

| API | 無料枠 | API キー | 電車対応（東京） | arriveBy 対応 | 商用利用 | セットアップコスト | 備考 |
|-----|--------|---------|----------------|--------------|---------|-----------------|------|
| OTP2 | 完全無料 | 不要 | ✅ 22 事業者対応 | ✅（`arriveBy` / `latestArrival`） | 可 | 高（JAR・PBF・グラフビルド） | セルフホスト。GTFS 有効期限修正が必要 |
| Google Routes API v2 | $200/月分 | 必要 | ❌ 東京 transit 不可 | ✅（DRIVE のみ有効） | 可 | 低 | transit は使えない（Issue #35826181） |
| Yahoo! 乗換案内 | 未調査 | 未調査 | 未調査 | 未調査 | 未調査 | 未調査 | |
| Navitime | 未調査 | 未調査 | 未調査 | 未調査 | 未調査 | 未調査 | |
| OpenRouteService | 無料 | 不要 | ❌ | ❌ | 可 | 中 | 徒歩・車のみ。電車不要なら有力 |

---

## 6. OTP2 の検証タスク（未実施チェックリスト）

詳細は `../learn-OpenTripPlanner/開発計画.md` を参照。

### Phase 0: セットアップ（未実施）

- [ ] **#0-1** GTFS の有効期限修正と再生成（`end_date` を `2026-12-31` に変更して `poetry run python src/main.py` を再実行）
- [ ] **#0-2** OSM PBF のダウンロード（`kanto-latest.osm.pbf`、Geofabrik、約 700MB）
- [ ] **#0-3** OTP2 JAR のダウンロード（`otp-2.7.0-shaded.jar`、GitHub Releases、約 150MB）
- [ ] **#0-4** `build-config.json` / `router-config.json` の作成（`learn-OpenTripPlanner/開発計画.md #0-4` 参照）
- [ ] **#0-5** グラフビルド実行（`java -Xmx4G -jar otp.jar --build --save data/`、20〜40 分）・起動確認

### Phase 1: 動作検証（#0-5 完了後）

- [ ] **#1-1** GraphQL クエリで経路検索の動作確認
  - 「2026-03-10 に渋谷へ 9:00 着」の経路が返るか
  - `latestArrival` で出発時刻が正しく逆算されるか

---

## 7. 選定後に確定させること

OTP2（または他の API）を選定した後、以下を確定して各設計ドキュメントに反映する：

- `travel_mode` ENUM 値と API の mode 値のマッピング（`データモデル草案.md § B-1` の仕様確認事項を解消）
- `POST /routes/search` レスポンス構造（`API詳細設計.md § Routes` の保留事項を解消）
- `POST /routes/departure-time` レスポンス構造（同上）
- OTP2 採用の場合、GraphQL クエリの確定（`planConnection` vs `plan` クエリの選択）

---

## 8. 参考リンク

- [OTP2 公式ドキュメント](https://docs.opentripplanner.org/)
- [OTP2 GraphQL API リファレンス](https://docs.opentripplanner.org/api/dev-2.x/graphql-gtfs/)
- [planConnection クエリ](https://docs.opentripplanner.org/api/dev-2.x/graphql-gtfs/queries/planConnection)
- [OTP2 GitHub](https://github.com/opentripplanner/OpenTripPlanner)
- [TrainGTFSGenerator GitHub](https://github.com/fksms/TrainGTFSGenerator)
- [ODPT 公式（公共交通オープンデータセンター）](https://www.odpt.org/)
- [ODPT 開発者登録](https://developer.odpt.org/)
- [Geofabrik Japan PBF](https://download.geofabrik.de/asia/japan.html)

---

## 参考ドキュメント（相互リンク）

- `../learn-OpenTripPlanner/OTP2-investigation-report.md` — OTP2 詳細調査レポート
- `../learn-OpenTripPlanner/開発計画.md` — OTP2 実装チェックリスト（Phase 0〜3）
- `backend/app/api/api仕様.md § 経路 (Routes)` — エンドポイント一覧と想定リクエスト項目
- `backend/docs/API詳細設計.md § Routes` — 保留中の詳細設計
- `backend/docs/データモデル草案.md § B-1` — travel_mode ENUM 値の仕様確認事項
- `backend/docs/開発スケジュール.md § Phase 0 > Routes` — 意思決定タスク
