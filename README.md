# Dokodemo Issyo Agent (仮)

[![Powered by Cloudflare Workers](https://img.shields.io/badge/powered%20by-Cloudflare%20Workers-orange)](https://workers.cloudflare.com/)
[![Built with Hono](https://img.shields.io/badge/built%20with-Hono-ff69b4)](https://hono.dev/)
[![Uses Google Gemini](https://img.shields.io/badge/uses-Google%20Gemini-blue)](https://ai.google.dev/)

Cloudflare Workers 上で動作する、Google Gemini を利用したキャラクター会話 LINE ボットです。
キャラクター（現在はトロとクロ）がユーザーとの対話を通じて状態（機嫌、覚えた単語、現在の活動など）を変化させ、より自然でインタラクティブな会話体験を提供します。

## 概要

このプロジェクトは、Cloudflare Workers, Hono, Google Gemini, Cloudflare D1 を組み合わせて構築された LINE ボットです。

* **LINE Messaging API:** ユーザーとのインターフェース
* **Hono:** Cloudflare Workers 上でのルーティングとリクエスト処理
* **Google Gemini (via AI SDK):**
  * ユーザーの意図解釈 (Controller LLM)
  * キャラクターの行動決定 (Controller LLM)
  * キャラクターに基づいた応答生成 (Action Executor)
* **Cloudflare D1:**
  * 会話履歴の保存
  * キャラクターの状態（性格、口調、機嫌、覚えた単語など）の永続化
* **Neverthrow:** エラーハンドリング
* **Zod:** スキーマ定義とバリデーション
* **TypeScript:** 静的型付けによる開発効率とコード品質の向上
* **Biome/Prettier:** コードフォーマットとリント

## 特徴

* **キャラクターエージェント:** 独自の性格、口調、状態を持つキャラクター（トロ、クロ）との会話。
* **状態管理:** 会話内容に応じてキャラクターの機嫌や覚えている単語、現在の活動（通常、しりとり中など）が変化します。
* **インタラクティブ機能:** しりとりなどの簡単なゲームが可能です。
* **LLM 活用:** Google Gemini を利用して、文脈に応じた自然な応答を生成します。
* **サーバーレス:** Cloudflare Workers と D1 により、スケーラブルで管理しやすいインフラ。

## 技術スタック

* **ランタイム:** Cloudflare Workers
* **フレームワーク:** Hono
* **言語:** TypeScript
* **AI モデル:** Google Gemini (via Vercel AI SDK)
* **データベース:** Cloudflare D1
* **パッケージ管理:** pnpm
* **フォーマット/リント:** Biome, Prettier
* **バリデーション:** Zod
* **エラーハンドリング:** Neverthrow
* **プラットフォーム連携:** LINE Messaging API

## セットアップ

### 前提条件

* Node.js (v18 以降推奨)
* pnpm (`npm install -g pnpm`)
* Cloudflare アカウント
* Wrangler CLI (`pnpm install -g wrangler`)
* LINE Developers アカウントと Messaging API チャネル
* Google AI Studio で API キーを取得

### 手順

1. **リポジトリをクローン:**

    ```bash
    git clone https://github.com/coji/dokodemo-issyo
    cd dokodemo-issyo
    ```

2. **依存関係をインストール:**

    ```bash
    pnpm install
    ```

3. **Cloudflare D1 データベースの準備:**
    * Wrangler を使用して D1 データベースを作成します (まだ存在しない場合)。

    ```bash
    pnpm wrangler d1 create dokodemo_db
    ```

作成したデータベースの情報を `wrangler.jsonc` の `d1_databases` セクションに設定します (`database_name`, `database_id`)。

4. **環境変数の設定:**
    *プロジェクトルートに `.dev.vars` ファイルを作成します。
    * 以下の内容を記述し、実際の値に置き換えます。

        ```ini
        LINE_CHANNEL_ACCESS_TOKEN="<Your LINE Channel Access Token>"
        LINE_CHANNEL_SECRET="<Your LINE Channel Secret>"
        GOOGLE_GENERATIVE_AI_API_KEY="<Your Google Gemini API Key>"
        ```

5. **データベースマイグレーション:**
    * 開発環境用に D1 データベースのテーブルを作成し、初期データを投入します。

        ```bash
        # ローカル環境でのマイグレーション実行
        pnpm wrangler d1 migrations apply DB --local
        ```

## ローカル開発

1. **開発サーバーを起動:**

    ```bash
    pnpm dev
    ```

    Wrangler がローカルサーバーを起動し、Cloudflare Tunnel を介して外部からアクセス可能な URL を表示します。
2. **LINE Webhook 設定:**
    * LINE Developers Console で、ボットの Messaging API 設定を開きます。
    * Webhook URL に `pnpm dev` で表示された URL (`https://<your-tunnel-id>.cfargotunnel.com` のような形式) の末尾に `/webhook` を追加したものを設定します。
    * 「Webhookの利用」をオンにします。
3. **動作確認:**
    * LINE アプリからボットにメッセージを送ると、ローカルサーバーで処理され、応答が返ってきます。コンソールログで動作を確認できます。

## デプロイ

1. **Cloudflare にデプロイ:**

    ```sh
    pnpm deploy
    ```

2. **本番環境の D1 マイグレーション:**

    ```sh
    pnpm wrangler d1 migrations apply DB --remote
    ```

3. **LINE Webhook 設定:**
    * LINE Developers Console で、Webhook URL をデプロイされた Cloudflare Worker の URL (`https://dokodemo.<your-account>.workers.dev/webhook` のような形式) に更新します。

## ディレクトリ構成

```sh
.
├── .gitignore           # Git で無視するファイル/ディレクトリ
├── README.md            # このファイル
├── biome.json           # Biome (Linter/Formatter) 設定
├── migrations           # D1 データベースマイグレーションファイル
│   ├── 0001_init.sql
│   ├── 0002_alter_口調_to_tone.sql
│   └── 0003_add_character_state.sql
├── package.json         # プロジェクト情報と依存関係
├── pnpm-lock.yaml       # 依存関係のロックファイル
├── pnpm-workspace.yaml  # pnpm ワークスペース設定 (現状では単一プロジェクト)
├── schema.sql           # (参考用) D1 スキーマ定義 (最新は migrations を参照)
├── src                  # ソースコード
│   ├── agent.ts         # キャラクターエージェントのメインロジック
│   ├── index.ts         # Hono アプリケーションのエントリポイント (Worker エントリ)
│   └── utils            # ユーティリティ関数
│       ├── agent        # エージェント関連モジュール
│           ├── action-executor.ts  # LLM が決定したアクションを実行
│           └── controller-llm.ts   # LLM を使って次のアクションを決定
│       ├── character.ts   # キャラクターデータの取得・更新
│       ├── d1.ts          # Cloudflare D1 関連処理 (会話履歴など)
│       ├── intent-analyzer.ts # (旧) 意図分析 (現在は agent.ts に統合)
│       ├── line.ts        # LINE API 関連処理 (応答送信など)
│       └── response-generator.ts # (旧) 応答生成 (現在は agent.ts に統合)
├── tsconfig.json        # TypeScript コンパイラ設定
├── worker-configuration.d.ts # Cloudflare Worker の型定義
└── wrangler.jsonc       # Wrangler (Cloudflare Workers CLI) 設定
```

## コードフォーマットとリント

このプロジェクトでは Biome を使用しています。

* **フォーマット:**

    ```bash
    # Biome でフォーマット
    pnpm run format
    ```

* **リント:**

    ```bash
    # Biome でリント
    pnpm run lint
    ```

## 今後の改善点 (TODO)

* キャラクター状態のより詳細な管理（好感度、記憶など）
* より複雑なインタラクションの実装
* Controller LLM のプロンプトチューニングによる精度向上
* エラーハンドリングの強化
* テストコードの追加
