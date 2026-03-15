# Frontend

iPhone用「執事」アプリのフロントエンドリポジトリです。  
このプロジェクトは、**mise** と **pnpm** を使用したモダンな開発環境を採用しています。

---

## 🛠 開発環境

ディレクトリごとにツールバージョンを自動切り替えする構成です。

- **Runtime:** `Node.js v22.14.0` (managed by mise)
- **Package Manager:** `pnpm v10.4.0`
- **Framework:** `Expo SDK 54` (React Native)
- **Development Tool:** `Antigravity` (AI-assisted coding)

---

## 🚀 セットアップ手順

### 1. mise のインストール

未導入の場合は、以下のコマンドでインストールします。

```bash
curl https://mise.run | sh
```

> [!NOTE]  
> シェルの設定ファイル（`~/.zshrc` や `~/.bashrc`）に `eval "$(mise activate [shell])"` を追記し、`source` してください。

### 2. ツールのセットアップ

`frontend` ディレクトリに移動し、設定されたツールを導入します。

```bash
cd frontend
mise install
```

### 3. ライブラリのインストール

```bash
pnpm install
```

### 4. 環境設定ファイルの作成

```bash
cp .env.example .env
```

※ `.env` 内の `EXPO_PUBLIC_ENV` が `local` であることを確認してください。

---

## 💻 開発コマンド

| コマンド        | 内容                                       |
| :-------------- | :----------------------------------------- |
| `pnpm dev`      | ローカル開発サーバーの起動 (環境: `local`) |
| `pnpm dev:stg`  | ステージング環境での起動                   |
| `pnpm dev:prod` | 本番環境設定での起動                       |
| `pnpm lint`     | コードの静的解析（Linter）                 |

---

## 📱 実機（iPhone）での確認方法

1. iPhoneに **Expo Go** アプリをインストールします。
2. PCとiPhoneを同じWi-Fiに接続します。
3. `pnpm dev` を実行し、ターミナルに表示された **QRコード** を読み取ります。

> [!TIP]  
> WSL2環境などでネットワークの問題で繋がらない場合は、以下のトンネルモードを試してください。  
> `npx expo start --tunnel`

---

## 🎨 開発ガイドライン
