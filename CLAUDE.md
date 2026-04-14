# Claudeへの引き継ぎ書

## このファイルの使い方
新しいチャットを始めるときに、このファイルの内容をそのまま貼り付けてください。
するとClaudeがプロジェクトの状況を把握した状態で会話を始められます。

## プロジェクトの背景
- コーディング初心者がYouTubeショート動画の自動投稿システムを構築中
- ClaudeCodeに操縦してもらいながら少しずつ進めている
- Windows環境で作業している
- 当初はInstagramへの投稿を目指していたが、Meta APIの審査が厳しいためYouTubeに方針転換した

## 現在の進捗
- ✅ Phase 1：①台本生成・②テキスト検証が完成
- ✅ Phase 2：③音声生成が完成（ElevenLabs Starter・Hina・v3）
- ✅ Phase 3：④Remotionで動画合成が完成
- ✅ Phase 4：⑤YouTubeへの自動アップロードが完成
- ✅ 改善：Gemini APIで画像自動生成（ギンバトキャラクター固定）
- ✅ 改善：ポップアップアニメーション付きテロップ（spring関数使用）
- ✅ 改善：4シーン・30秒・月30本構成に最適化
- ✅ 改善：Geminiでテーマ候補を自動生成・選択
- ✅ 改善：ElevenLabs v3 + Hina音声（日本語女性）
- ✅ 改善：ffmpegで音声を1.3倍速に変換
- ✅ 改善：v3向けタグ（[calmly][pause]等）を台本に自動挿入

## 現在の実行手順

### ステップ①②③＋画像生成：
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

## 環境情報
- OS：Windows
- Node.js：v24.14.1
- Python：3.14.4
- 作業フォルダ：C:\Users\elfka\OneDrive\デスクトップ\video-bot（台本・音声・投稿）
- 作業フォルダ：C:\Users\elfka\OneDrive\デスクトップ\video-bot\remotion（動画合成）

## 各ファイルの役割
- `video-bot/generate_script.js`：ClaudeAPIで台本をJSON生成
- `video-bot/validate_script.js`：シーン数（6）・文字数チェック・投稿文整形
- `video-bot/generate_audio.js`：edge-ttsで音声生成（ja-JP-NanamiNeural）
- `video-bot/generate_images.js`：Gemini APIで画像生成（テーマに沿ったキャラクター）
- `video-bot/fetch_videos.js`：Pexels APIで背景動画取得（現在は画像生成に切り替え済み）
- `video-bot/auth_youtube.js`：YouTube認証（OAuth2.0）
- `video-bot/upload_youtube.js`：YouTubeに動画をアップロード（タイトルに#Shorts付き）
- `video-bot/run.js`：①②③＋画像生成＋ファイルコピーをまとめて実行
- `video-bot/client_secret.json`：Google OAuth認証情報（Gitに上げない）
- `video-bot/token.json`：YouTubeアクセストークン（Gitに上げない）
- `remotion/src/Composition.tsx`：背景画像・テロップ・音声の合成
- `remotion/src/Root.tsx`：動画サイズ（1080x1920）・長さの設定

## 重要な技術的決定とその理由
- **音声生成にedge-ttsを使用**：ElevenLabsの無料プランではAPIが使えなかったため。本番移行時はElevenLabsに切り替え予定
- **YouTubeに投稿**：Instagram Graph APIはビジネス認証が必要で個人開発者には難しいため
- **Gemini APIで画像生成**：テーマに沿ったキャラクター（枕など小道具をキャラクター化）をPixar風3Dアニメーションスタイルで生成
- **テロップにspring関数**：Remotionのspring関数で弾むようなポップアップアニメーションを実現
- **6シーン構成**：シーン1がフック、シーン2〜6が「〇〇5選」形式の各項目紹介
- **レンダリングオプション**：`--codec h264 --crf 18 --timeout 240000`

## 既知の問題・改善点
- 音声ファイルのコピーは自動化済みだが、動画合成は手動でremotionフォルダに移動して実行する必要がある
- Geminiサーバーが混雑している時間帯はタイムアウトが発生することがある
- ElevenLabsは有料プランで高品質な音声に切り替え予定

## 次にやること（優先順位順）
- [ ] 続きの作業（次回確認）
- [ ] ElevenLabsをCreatorプランに切り替える（音声の選択肢を増やす）
- [ ] Hedraの有料プランを検討する（チャンネルが育ってきたら）
- [ ] run.jsの完全自動化をさらに磨く

## Claudeへのお願い
- コーディング初心者なので、1ステップずつ丁寧に指示を出してください
- コマンドはそのままコピペできる形で提示してください
- エラーが出たら原因を簡単に説明してから解決策を提示してください
- 作業の進捗をこまめに確認しながら進めてください
- わかりにくい部分は完成形のコードを提示してください