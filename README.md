# YouTube ショート動画 自動投稿システム

## システム概要
ClaudeAIで台本を生成し、音声合成・画像生成・動画合成・YouTube自動投稿までを自動化するシステム。

## フォルダ構成
ではREADME.mdを開いて、中身を全部選択（Ctrl + A）して削除し、以下を丸ごと貼り付けてください。
markdown# YouTube ショート動画 自動投稿システム

## システム概要
ClaudeAIで台本を生成し、音声合成・画像生成・動画合成・YouTube自動投稿までを自動化するシステム。

## フォルダ構成
デスクトップ/
├── video-bot/                    # メインの自動化スクリプト群
│   ├── generate_script.js        # ①台本生成（Anthropic API）
│   ├── validate_script.js        # ②テキスト検証・整形
│   ├── generate_audio.js         # ③音声生成（edge-tts）
│   ├── generate_images.js        # ④画像生成（Gemini API）
│   ├── fetch_videos.js           # Pexels動画取得（現在は画像生成に切り替え済み）
│   ├── auth_youtube.js           # YouTube認証（OAuth2.0）
│   ├── upload_youtube.js         # ⑤YouTubeアップロード
│   ├── run.js                    # ①②③④をまとめて実行
│   ├── get_audio_duration.py     # 音声の長さを自動取得
│   ├── client_secret.json        # Google認証情報（非公開）
│   ├── token.json                # YouTubeトークン（非公開）
│   ├── prompts/
│   │   └── system_prompt.txt     # Claudeへの指示書
│   └── output/
│       ├── script.json           # 生成された台本
│       ├── audio_durations.json  # 音声の長さ
│       └── audio/                # 生成された音声ファイル
└── remotion/                     # 動画合成プロジェクト
├── src/
│   ├── Composition.tsx       # 動画の中身（背景画像・テロップ・音声）
│   └── Root.tsx              # 動画の設定（サイズ・長さ）
├── public/
│   ├── script.json           # video-botからコピーしたもの
│   ├── audio_durations.json  # video-botからコピーしたもの
│   ├── audio/                # video-botからコピーした音声
│   └── images/               # Gemini APIで生成した画像
└── output.mp4                # 完成した動画ファイル
## 実行手順

### ステップ①②③＋画像生成
```bash
cd video-bot
node run.js
```

### ステップ④：動画合成
```bash
cd remotion
npx remotion render MyComp output.mp4 --codec h264 --crf 18 --timeout 240000
```

### ステップ⑤：YouTubeアップロード
```bash
cd ..
node upload_youtube.js
```

## 技術スタック
| 用途 | ツール |
|---|---|
| 台本生成 | Anthropic API（claude-opus-4-5） |
| 音声生成 | edge-tts（無料・日本語女性音声 Nanami） |
| 画像生成 | Gemini API（gemini-3.1-flash-image-preview） |
| 動画合成 | Remotion（React） |
| YouTube投稿 | YouTube Data API v3 |

## 動画の構成
- 6シーン構成（約45秒）
- シーン1：フック（約5秒）
- シーン2〜6：各項目紹介（各約8秒）
- バズりやすい構成（意外な事実・CTA付き）

## 既知の問題・改善点
- 動画合成は手動でremotionフォルダに移動して実行する必要がある
- Geminiサーバーが混雑している時間帯はタイムアウトが発生することがある
- ElevenLabsは有料プランで高品質な音声に切り替え予定

## 今後やること
- [ ] Geminiでテーマ候補を自動生成する仕組みを作る
- [ ] テーマを外から指定できるようにする
- [ ] run.jsに動画合成・YouTubeアップロードまで含めて完全自動化する
- [ ] ElevenLabsの有料プランに切り替える