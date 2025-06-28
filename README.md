# Unity MCP 統合フレームワーク

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
![Unity](https://img.shields.io/badge/Unity-2022.3.22--Unity6.1-black.svg)
![.NET](https://img.shields.io/badge/.NET-C%23_9.0-purple.svg)
![GitHub Stars](https://img.shields.io/github/stars/isuzu-shiranui/UnityMCP?style=social)

[English Version](./README.en.md)

Unity と Model Context Protocol (MCP) を統合するための拡張可能なフレームワークです。このフレームワークにより、Claude などの AI 言語モデルがスケーラブルなハンドラーアーキテクチャを通じて Unity エディタと直接対話することができます。

## 🌟 特徴

- **拡張可能なプラグインアーキテクチャ**: カスタムハンドラーを作成・登録して機能を拡張
- **完全なMCP統合**: コマンド・リソース・プロンプトの全MCP基本機能をサポート
- **TypeScript & C# サポート**: サーバーコンポーネントは TypeScript、Unity コンポーネントは C#
- **エディタ統合**: カスタマイズ可能な設定を持つエディタツールとして動作
- **自動検出**: 各種ハンドラーの自動検出と登録
- **通信**: Unity と外部 AI サービス間の TCP/IP ベースの通信

## 📋 必要条件

- Unity 2022.3.22f1 以上（Unity6.1 にも対応）
   - 2022.3.22f1, 2023.2.19f1, 6000.0.35f1, 6000.1.0f1で動作確認
- .NET/C# 9.0
- Node.js 18.0.0 以上と npm（TypeScript サーバー用）
   - [Node.js 公式サイト](https://nodejs.org/)からインストールしてください

## 🚀 はじめに

### インストール方法

1. Unity パッケージマネージャーを使用してインストール:
   - パッケージマネージャーを開く (Window > Package Manager)
   - 「+」ボタンをクリック
   - 「Add package from git URL...」を選択
   - 入力: `https://github.com/isuzu-shiranui/UnityMCP.git?path=jp.shiranui-isuzu.unity-mcp`

### クイックセットアップ

1. Unity を開き、Edit > Preferences > Unity MCP に移動
2. 接続設定 (ホストとポート) を構成
3. 「Connect」ボタンをクリックして接続の待ち受けを開始

### Claude Desktop との連携

#### インストーラーを使う場合

Unity MCPにはTypeScriptクライアントの簡単なインストールと設定のためのツールが含まれています。

1. Unityエディタで、「Edit > Preferences > Unity MCP」に移動します
2. 「Open Installer Window」ボタンをクリックしてTypeScriptクライアントインストーラーを開きます
3. インストーラーの指示に従って操作します：
   - Node.jsがインストールされていることを確認します（インストールされていない場合はダウンロードリンクが表示されます）
   - 最新バージョンを取得するには「Latest」ボタンをクリックします
   - インストール先フォルダを選択し、「Download and Install TypeScript Client」ボタンをクリックします
   - インストールが完了したら、「Configuration Preview」セクションを開いて設定JSONをクリップボードにコピーします
4. Claude Desktopの設定を行います：
   - Claude Desktopを開きます
   - 「Claude」メニューをクリックし、「Settings...」を選択します
   - 「Developer」タブをクリックし、「Edit Config」ボタンをクリックします
   - コピーした設定を貼り付けて保存します
5. Claude Desktopを再起動すると設定が適用されます

これで、Claude Desktopが自動的にUnity MCPクライアントに接続し、Unity Editorとのシームレスな連携が可能になります。

#### 手動でインストールする場合

1. リリースページから最新のZIPファイルをダウンロードして解凍します
2. `build/index.js` ファイルのフルパスを控えておきます
3. Claude Desktop の設定ファイル `claude_desktop_config.json` を開きます
4. 以下の内容を追加して保存します:

```json
{
   "mcpServers": {
      "unity-mcp": {
         "command": "node",
         "args": [
            "path/to/index.js"
         ]
      }
   }
}
```
※ `path/to/index.js` は実際のパスに置き換えてください（Windowsの場合はバックスラッシュをエスケープ"\\\\"するか、フォワードスラッシュ"/"を使用）

## 🔌 アーキテクチャ

Unity MCP フレームワークは主に 2 つのコンポーネントで構成されています:

### 1. Unity C# プラグイン

- **McpServer**: TCP 接続をリッスンしコマンドをルーティングするコアサーバー
- **IMcpCommandHandler**: カスタムコマンドハンドラーを作成するためのインターフェース
- **IMcpResourceHandler**: データ提供リソースを作成するためのインターフェース
- **McpSettings**: プラグイン設定を管理
- **McpServiceManager**: サービス管理のための依存性注入システム
- **McpHandlerDiscovery**: 各種ハンドラーを自動検出して登録

### 2. TypeScript MCP クライアント

- **HandlerAdapter**: 各種ハンドラーを MCP SDK に適応させる
- **HandlerDiscovery**: ハンドラー実装の検出と登録
- **UnityConnection**: Unity との TCP/IP 通信を管理
- **BaseCommandHandler**: コマンドハンドラー実装のベースクラス
- **BaseResourceHandler**: リソースハンドラー実装のベースクラス
- **BasePromptHandler**: プロンプトハンドラー実装のベースクラス

## 📄 MCP ハンドラータイプ

Unity MCPでは、Model Context Protocol (MCP) に基づく以下の3種類のハンドラータイプをサポートしています:

### 1. コマンドハンドラー（Tools）

- **用途**: アクションを実行するためのツール（Unity側で何かを実行させる）
- **制御**: モデル制御型 - AIモデルが自動的に呼び出せる
- **実装**: IMcpCommandHandler インターフェースを実装

### 2. リソースハンドラー（Resources）

- **用途**: Unity内のデータにアクセスするためのリソース（情報提供）
- **制御**: アプリケーション制御型 - クライアントアプリが使用を決定
- **実装**: IMcpResourceHandler インターフェースを実装

### 3. プロンプトハンドラー（Prompts）

- **用途**: 再利用可能なプロンプトテンプレートやワークフロー
- **制御**: ユーザー制御型 - ユーザーが明示的に選択して使用
- **実装**: IPromptHandler インターフェースを実装（TypeScript側のみ）

## 🔬 サンプルコード

パッケージには以下のサンプルが含まれています：

1. **Unity MCP Handler Samples**
   - C#実装のサンプルコード
   - そのままプロジェクトにインポートして使用可能

2. **Unity MCP Handler Samples JavaScript**
   - JavaScript実装のサンプルコード
   - この中のJSファイルは`build/handlers`ディレクトリにコピーして使用してください

> ⚠️ **注意**: サンプルコードには任意コード実行機能が含まれています。本番環境での使用には十分注意してください。

サンプルのインポート方法:
1. Unity パッケージマネージャーで本パッケージを選択
2. 「Samples」タブをクリック
3. 必要なサンプルの「Import」ボタンをクリック

## 🛠️ カスタムハンドラーの作成

### コマンドハンドラー (C#)

`IMcpCommandHandler` を実装する新しいクラスを作成:

```csharp
using Newtonsoft.Json.Linq;
using UnityMCP.Editor.Core;

namespace YourNamespace.Handlers
{
    internal sealed class YourCommandHandler : IMcpCommandHandler
    {
        public string CommandPrefix => "yourprefix";
        public string Description => "ハンドラーの説明";

        public JObject Execute(string action, JObject parameters)
        {
            // コマンドロジックを実装
            if (action == "yourAction")
            {
                // パラメータを使って何かを実行
                return new JObject
                {
                    ["success"] = true,
                    ["result"] = "結果データ"
                };
            }

            return new JObject
            {
                ["success"] = false,
                ["error"] = $"不明なアクション: {action}"
            };
        }
    }
}
```

### リソースハンドラー (C#)

`IMcpResourceHandler` を実装する新しいクラスを作成:

```csharp
using Newtonsoft.Json.Linq;
using UnityMCP.Editor.Resources;

namespace YourNamespace.Resources
{
    internal sealed class YourResourceHandler : IMcpResourceHandler
    {
        public string ResourceName => "yourresource";
        public string Description => "リソースの説明";
        public string ResourceUri => "unity://yourresource";

        public JObject FetchResource(JObject parameters)
        {
            // リソースデータを取得する処理を実装
            var data = new JArray();
            
            // 何かデータを取得・加工してJArrayに追加
            data.Add(new JObject
            {
                ["name"] = "項目1",
                ["value"] = "値1"
            });

            return new JObject
            {
                ["success"] = true,
                ["items"] = data
            };
        }
    }
}
```

### コマンドハンドラー (TypeScript)

`BaseCommandHandler` を拡張して新しいハンドラーを作成:

```typescript
import { IMcpToolDefinition } from "../core/interfaces/ICommandHandler.js";
import { JObject } from "../types/index.js";
import { z } from "zod";
import { BaseCommandHandler } from "../core/BaseCommandHandler.js";

export class YourCommandHandler extends BaseCommandHandler {
   public get commandPrefix(): string {
      return "yourprefix";
   }

   public get description(): string {
      return "ハンドラーの説明";
   }

   public getToolDefinitions(): Map<string, IMcpToolDefinition> {
      const tools = new Map<string, IMcpToolDefinition>();

      // ツールを定義
      tools.set("yourprefix_yourAction", {
         description: "アクションの説明",
         parameterSchema: {
            param1: z.string().describe("パラメータの説明"),
            param2: z.number().optional().describe("オプションパラメータ")
         },
         annotations: {
            title: "ツールのタイトル",
            readOnlyHint: true,
            openWorldHint: false
         }
      });

      return tools;
   }

   protected async executeCommand(action: string, parameters: JObject): Promise<JObject> {
      // コマンドロジックを実装
      // リクエストを Unity に転送
      return await this.sendUnityRequest(
              `${this.commandPrefix}.${action}`,
              parameters
      );
   }
}
```

### リソースハンドラー (TypeScript)

`BaseResourceHandler` を拡張して新しいリソースハンドラーを作成:

```typescript
import { BaseResourceHandler } from "../core/BaseResourceHandler.js";
import { JObject } from "../types/index.js";
import { URL } from "url";

export class YourResourceHandler extends BaseResourceHandler {
   public get resourceName(): string {
      return "yourresource";
   }

   public get description(): string {
      return "リソースの説明";
   }

   public get resourceUriTemplate(): string {
      return "unity://yourresource";
   }

   protected async fetchResourceData(uri: URL, parameters?: JObject): Promise<JObject> {
      // リクエストパラメータを処理
      const param1 = parameters?.param1 as string;

      // Unityにリクエストを送信
      const response = await this.sendUnityRequest("yourresource.get", {
         param1: param1
      });

      if (!response.success) {
         throw new Error(response.error as string || "リソース取得に失敗しました");
      }

      // 応答データを整形して返す
      return {
         items: response.items || []
      };
   }
}
```

### プロンプトハンドラー (TypeScript)

`BasePromptHandler` を拡張して新しいプロンプトハンドラーを作成:

```typescript
import { BasePromptHandler } from "../core/BasePromptHandler.js";
import { IMcpPromptDefinition } from "../core/interfaces/IPromptHandler.js";
import { z } from "zod";

export class YourPromptHandler extends BasePromptHandler {
   public get promptName(): string {
      return "yourprompt";
   }

   public get description(): string {
      return "プロンプトの説明";
   }

   public getPromptDefinitions(): Map<string, IMcpPromptDefinition> {
      const prompts = new Map<string, IMcpPromptDefinition>();

      // プロンプト定義を登録
      prompts.set("analyze-component", {
         description: "Unityコンポーネントを分析する",
         template: "以下のUnityコンポーネントを詳細に分析し、改善点を提案してください:\n\n```csharp\n{code}\n```",
         additionalProperties: {
            code: z.string().describe("分析対象のC#コード")
         }
      });

      return prompts;
   }
}
```

**注意**: C#側の`IMcpCommandHandler`または`IMcpResourceHandler`を実装したクラスはプロジェクト内のどこに配置しても、アセンブリ検索によって自動的に検出・登録されます。TypeScript側も同様に`handlers`ディレクトリに配置することで自動検出されます。

## 🔄 通信フロー

1. Claude (または他の AI) がMCPのいずれかの機能（ツール/リソース/プロンプト）を呼び出す
2. TypeScript サーバーが TCP 経由で Unity にリクエストを転送
3. Unity の McpServer がリクエストを受信し、適切なハンドラーを見つける
4. ハンドラーが Unity のメインスレッドでリクエストを処理
5. 結果が TCP 接続を通じて TypeScript サーバーに戻される
6. TypeScript サーバーが結果をフォーマットして Claude に返す

## ⚙️ 設定

### Unity 設定

Edit > Preferences > Unity MCP から設定にアクセス:

- **Host**: サーバーをバインドする IP アドレス (デフォルト: 127.0.0.1)
- **Port**: リッスンするポート (デフォルト: 27182)
- **UDP Discovery**: TypeScriptサーバーの自動検出を有効化
- **Auto-start on Launch**: Unity 起動時に自動的にサーバーを開始
- **Auto-restart on Play Mode Change**: プレイモードの開始/終了時にサーバーを再起動
- **Detailed Logs**: デバッグ用の詳細ログを有効化

### TypeScript 設定

TypeScript サーバーの環境変数:

- `MCP_HOST`: Unity サーバーホスト (デフォルト: 127.0.0.1)
- `MCP_PORT`: Unity サーバーポート (デフォルト: 27182)
- `MCP_FORCE_KILL`: ポート使用中のプロセスを自動終了 (デフォルト: false)
  - `true` または `1` に設定すると、指定ポートを使用中の既存プロセスを自動的に終了してサーバーを起動します

## 🔍 トラブルシューティング

### 一般的な問題

1. **接続エラー**
   - Unity側のファイアウォール設定を確認
   - ポート番号が正しく設定されているか確認
   - 別のプロセスが同じポートを使用していないか確認
   - ポート競合が発生している場合は、環境変数 `MCP_FORCE_KILL=true` を設定して既存プロセスを自動終了

2. **ハンドラーが登録されない**
   - ハンドラークラスが正しいインターフェースを実装しているか確認
   - C#ハンドラーがpublicまたはinternalアクセスレベルか確認
   - Unity側でログを確認し登録プロセスでエラーが発生していないか確認

3. **リソースが見つからない**
   - リソース名とURIが一致しているか確認
   - リソースハンドラーが正しく有効化されているか確認

### ログの確認

- Unity Console: McpServerからのログメッセージを確認
- TypeScriptサーバー: コンソール出力でMCP Inspectorなどを用いて通信エラーを確認

## 📚 組み込みハンドラー

### Unity (C#)

- **MenuItemCommandHandler**: Unity エディタのメニュー項目を実行
- **ConsoleCommandHandler**: Unity コンソールログ操作
- **AssembliesResourceHandler**: アセンブリ情報の取得
- **PackagesResourceHandler**: パッケージ情報の取得

### TypeScript

- **MenuItemCommandHandler**: メニュー項目実行
- **ConsoleCommandHandler**: コンソールログ操作
- **AssemblyResourceHandler**: アセンブリ情報の取得
- **PackageResourceHandler**: パッケージ情報の取得

## 📖 外部リソース

- [Model Context Protocol (MCP) 仕様](https://modelcontextprotocol.io/introduction)

## ⚠️ セキュリティに関する注意

1. **信頼できないハンドラーを実行しない**: 第三者が作成したハンドラーコードは、事前にセキュリティレビューを行ってから使用してください。
2. **コード実行権限を制限**: 特に`code_execute`コマンドを含むハンドラーは任意コード実行可能なため、運用環境では無効化を検討してください。

## 📄 ライセンス

このプロジェクトは MIT ライセンスの下で提供されています - 詳細はライセンスファイルを参照してください。

---

Shiranui-Isuzu いすず
