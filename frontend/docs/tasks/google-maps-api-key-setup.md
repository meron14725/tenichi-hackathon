# Google Maps API Key 設定タスク

## 概要

目的地選択画面でGoogle Maps JavaScript APIとPlaces APIを使用するため、APIキーの設定が必要。

## 必要なAPI

- **Maps JavaScript API** - 地図表示
- **Places API (New)** - 場所検索・オートコンプリート
- **Geocoding API** - マップタップ時の逆ジオコーディング

## 設定手順

1. [Google Cloud Console](https://console.cloud.google.com/) でプロジェクトを開く
2. 「APIとサービス」→「認証情報」でAPIキーを作成
3. 上記3つのAPIを有効化
4. APIキーのアプリケーション制限を設定（HTTPリファラー制限推奨）
5. 環境変数に設定:
   ```bash
   export EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=your_api_key_here
   ```
6. フロントエンド開発サーバー再起動

## 確認方法

- `http://localhost:8081/schedule/create` → 「目的地を探す」ボタンを押す
- 地図が表示され、場所検索ができればOK

## ステータス

- [ ] 未完了
