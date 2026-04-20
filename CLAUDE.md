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
- ✅ 完全自動化フロー完成（Discord→動画生成→YouTube予約投稿）
- ✅ ElevenLabs v3 + Hina音声（日本語女性）
- ✅ ffmpegで音声を1.3倍速に変換＋末尾に0.3秒の無音を追加
- ✅ M PLUS Rounded 1cフォント適用
- ✅ ナレーション字幕分割表示（句読点で切り替え）
- ✅ テーマ履歴管理（15日間被り防止・ジャンルバランス）
- ✅ もぷ子キャラクター確立（ギンバト・赤目・マフラー）
- ✅ チャンネル設定完了（おりこうもぷ子/@mopuko_ch）
- ✅ 台本：もぷ子スタイル・決め台詞・性格チラ見せ
- ✅ 発音辞書：「おりこう」のイントネーション修正
- ✅ PC起動時にDiscordボット自動起動
- ✅ YouTube予約投稿（朝7時・夜20時・選択式）
- ✅ 固定コメントをDiscordに自動送信（動画URLも同時送信）
- ✅ 動画を25秒以内に凝縮
- ✅ シーン3に「最後の一つが一番重要だよ！」の煽り追加
- ✅ タイトルに検索キーワード必須化
- ✅ シーン1のcaptionを巨大化（黄色・赤背景・叩きつけアニメーション）
- ✅ シーン1のcaption位置を画面中央（35%）に移動
- ✅ シーン2以降のcaptionに帯をつける
- ✅ 【強調キーワード】タグ対応（色変え・サイズアップ・ポップアップ）
- ✅ テーマ候補に現在の季節を反映
- ✅ テロップの「お利口」→「おりこう」変換（Composition.tsx内で処理）
- ✅ apply_text_normalization: "auto" 復活
- ✅ validate_script.jsの置換処理を削除しgenerate_audio.jsに統合
- ✅ シーン1のcaptionを句読点で2行分割（各行6文字以内）
- ✅ 朝・夜の投稿時間帯を選択式に変更
- ✅ 朝向けテーマ・プロンプト（system_prompt_morning.txt）を追加
- ✅ 音声から再生成オプション（置換済みscript_for_audio.jsonを手動編集可能）
- ✅ 画像を指定して再生成オプション（複数シーン番号指定可能）
- ✅ 背景画像の構図をランダム化（正面・後ろ姿・アップ・引きなど）
- ✅ YouTube Analytics + Data APIで動画パフォーマンス取得（fetch_analytics.js）
- ✅ Geminiによる自動分析・改善案生成（analyze_analytics.js）
- ✅ アップロード後に自動でAnalytics分析を実行しDiscordに通知
- ✅ generate_theme.jsにAnalyticsデータを反映（伸びた動画の傾向をテーマ選定に活用）
- ✅ Claude Code Companyの基本フロー確立（analytics_analysis.txt→Claude Codeに改善依頼→ブランチで実装→確認→マージ/キャンセル）
- ✅ シーン4にCTA追加（コメント誘導・いいね登録促し・もぷ子口調・2〜3本に1回）
- ✅ run.jsのreadline競合バグ修正（generate_theme.jsをrequireで呼び出すように変更）
- ✅ BGM追加（remotion/public/sounds/bgm.mp3・volume: 0.05・ループ再生）
- ✅ [pause]タグをElevenLabsに渡す前に除去（余計な音声の混入を防止）
- ✅ ffmpegで末尾に0.3秒の無音を追加（シーン切り替わりの間を確保）
- ✅ improve.js：分析からの改善案選択インターフェース完成（1〜9が改善案・0が能動的依頼・sがスキップ）
- ✅ 台本構成変更（伏せ字フック導入・「実は～」削除・「最後の1つが～」削除・決め台詞短縮）
- ✅ comment_mode機能追加（33%確率でguideモード・output/comment_mode.txtに保存）
- ✅ guideモード時：3つ目をDiscordに送信・normalモード時：2択固定コメントを生成
- ✅ コメント生成の異常レスポンス対策（200文字超でエラー）
- ✅ TikTok Developer登録・Sandboxでのアップロード動作確認
- ✅ TikTok審査申請済み（承認待ち）
- ✅ GitHub Pages（利用規約・プライバシーポリシー）公開

## 現在の実行手順

### 通常運用
```bash
cd video-bot
node run.js
```
起動後に以下のモードを選択：
- 1. 朝（7:00投稿）- 最初から全部実行・朝向けテーマ
- 2. 夜（20:00投稿）- 最初から全部実行・通常テーマ
- 3. 音声から再生成（台本・画像はそのまま・script_for_audio.jsonを編集可能）
- 4. 画像を指定して再生成（カンマ区切りでシーン番号を指定）

### YouTubeアップロード
```bash
cd video-bot
node upload_youtube.js
```
（アップロード後、固定コメントと動画URLがDiscordに自動送信される）

## 環境情報
- OS：Windows
- Node.js：v24.14.1
- Python：3.14.4
- 作業フォルダ：C:\Users\elfka\OneDrive\デスクトップ\video-bot（台本・音声・投稿）
- 作業フォルダ：C:\Users\elfka\OneDrive\デスクトップ\video-bot\remotion（動画合成）

## チャンネル情報
- **チャンネル名**：おりこうもぷ子
- **ハンドル**：@mopuko_ch
- **キャラクター**：白いギンバトの女の子（赤い目・カラフルストライプマフラー・2頭身・ふわふわ羽毛）
- **決め台詞**：「これで君も今日から、おりこうだね！明日もまた、ここで会おうね！」
- **予約投稿時間**：朝7:00・夜20:00（JST）・run.js起動時に選択

## ElevenLabs設定
- モデル：eleven_v3
- 音声：Hina（lhTvHflPVOqgSWyuWQry）
- stability: 0.4 / similarity_boost: 0.8 / style: 0.0 / speed: 1.2
- apply_text_normalization: "auto"
- 発音辞書ID：zVFZbpui2G6jNvOBFJPH（おりこうのイントネーション修正）

## 各ファイルの役割
- `video-bot/generate_theme.js`：Geminiでテーマ候補生成（季節反映・履歴管理・朝夜切り替え）
- `video-bot/generate_script.js`：ClaudeAPIで台本をJSON生成（朝夜でプロンプト切り替え）
- `video-bot/validate_script.js`：シーン数・文字数チェック・投稿文整形のみ（発音置換はしない）
- `video-bot/generate_audio.js`：ElevenLabs v3で音声生成（[pause]除去・--use-preparedオプションで置換スキップ）
- `video-bot/speed_up_audio.py`：ffmpegで1.3倍速変換＋末尾0.3秒無音追加
- `video-bot/generate_images.js`：Gemini APIで画像生成（--scenesオプションで指定シーンのみ生成）
- `video-bot/auth_youtube.js`：YouTube認証（OAuth2.0）
- `video-bot/upload_youtube.js`：YouTubeに動画をアップロード・固定コメントをDiscordに送信・アップロード後に自動でAnalytics分析を実行
- `video-bot/fetch_analytics.js`：YouTube Analytics API + Data APIで対象動画のデータを取得→output/analytics_report.jsonに保存
- `video-bot/analyze_analytics.js`：analytics_report.jsonをGeminiで分析→改善案をoutput/analytics_analysis.txtに保存・Discordに通知
- `video-bot/test_analytics.js`：Analytics APIのデバッグ用一時ファイル（削除可）
- `video-bot/copy_audio.js`：音声ファイルをremotion/public/audioにコピー（手動実行用）
- `video-bot/run.js`：モード選択→全ステップ統合実行（generate_theme.jsはrequireで呼び出し・stdin競合を回避）
- `video-bot/client_secret.json`：Google OAuth認証情報（Gitに上げない）
- `video-bot/token.json`：YouTubeアクセストークン（Gitに上げない）
- `video-bot/output/slot.txt`：朝夜の選択結果を保存（他スクリプトから参照）
- `video-bot/output/script_for_audio.json`：置換処理済みの音声用台本（手動編集可能）
- `video-bot/output/regenerate_scenes.txt`：再生成するシーン番号を保存（一時ファイル）
- `video-bot/prompts/system_prompt.txt`：夜向け台本生成プロンプト
- `video-bot/prompts/system_prompt_morning.txt`：朝向け台本生成プロンプト
- `remotion/src/Composition.tsx`：背景画像・テロップ・音声・BGMの合成
- `remotion/src/Root.tsx`：動画サイズ（1080x1920）・長さの設定
- `remotion/public/sounds/bgm.mp3`：BGM音源（ループ再生・volume: 0.05）
- `video-bot/improve.js`：improvements.jsonを読み込んで改善案を選択→improvement_instruction.txtに保存→Claude Codeを起動
- `video-bot/output/improvements.json`：Geminiが生成した改善案（最大9つ・JSON形式）
- `video-bot/output/comment_mode.txt`：normalまたはguide（33%の確率でguide）
- `video-bot/output/improvement_instruction.txt`：Claude Codeへの改善指示（一時ファイル）
- `video-bot/auth_tiktok.js`：TikTok OAuth認証（PKCE対応）
- `video-bot/upload_tiktok.js`：TikTokに動画をアップロード
- `video-bot/tiktok_token.json`：TikTokアクセストークン（Gitに上げない）
- `docs/terms.html`：利用規約（GitHub Pages公開）
- `docs/privacy.html`：プライバシーポリシー（GitHub Pages公開）

## 重要な技術的決定とその理由
- **音声生成にElevenLabs v3を使用**：Hina音声（lhTvHflPVOqgSWyuWQry）
- **YouTubeに投稿**：Instagram Graph APIはビジネス認証が必要で個人開発者には難しいため
- **Gemini APIで画像生成**：Pixar風3Dアニメーションスタイルでキャラクター生成
- **テロップにspring関数**：Remotionのspring関数で弾むようなポップアップアニメーション
- **4シーン構成**：シーン1がフック、シーン2〜4が「〇〇3選」形式
- **レンダリングオプション**：`--codec h264 --crf 18 --timeout 240000`
- **発音置換はgenerate_audio.jsのみで行う**：validate_script.jsで置換するとテロップにも影響が出るため
- **音声再生成時はscript_for_audio.jsonを使用**：置換済みファイルを手動編集→置換なしでElevenLabsに渡す
- **BGMはダッキングなし固定音量**：4シーン全部ナレーションのためダッキングすると不自然になるため
- **[pause]タグはElevenLabsに渡さない**：余計な音声混入を防止・代わりにffmpegで末尾に0.3秒の無音を追加

## generate_audio.js の重要設定
通常実行時（置換あり）と--use-prepared実行時（置換なし）で動作が分岐する。
どちらの場合も[pause]タグは除去してからElevenLabsに渡す。
置換処理の内容：
```javascript
.replace(/\[pause\]/g, "")
.replace(/【([^】]*)】/g, " $1 ")
.replace(/（[^）]*）/g, "")
.replace(/\([^)]*\)/g, "")
.replace(/6割/g, "ろくわり")
.replace(/7割/g, "ななわり")
.replace(/8割/g, "はちわり")
.replace(/1割/g, "いちわり")
.replace(/2割/g, "にわり")
.replace(/おりこうさん/g, "「お利口」")
.replace(/お利口さん/g, "「お利口」")
.replace(/おりこうだね/g, "「お利口」だね")
.replace(/おりこうだ/g, "「お利口」だ")
.replace(/(?<![一-龯])家(?![一-龯])/g, "いえ")
.replace(/通勤/g, "つうきん")
.replace(/重曹/g, "じゅうそう")
.replace(/SNS/g, "エスエヌエス")
.replace(/YouTube/g, "ユーチューブ")
.replace(/AI/g, "エーアイ")
.replace(/\s+/g, " ")
.trim()
```

ElevenLabs設定：
```javascript
model_id: "eleven_v3",
language_code: "ja",
apply_text_normalization: "auto",
voice_settings: {
  stability: 0.4,
  similarity_boost: 0.8,
  style: 0.0,
  speed: 1.2,
}
```

## Remotionのタグ処理
- `【強調キーワード】`：オレンジ色・大きめ・ポップアップ表示。前後に&nbsp;でスペース
- `（心の声）`：廃止済み。narrationに含まれていてもComposition.tsxで除去される
- テロップの「お利口」→「おりこう」に変換（splitByPause内で処理）
- シーン1のcaptionは句読点で2行分割（各行6文字以内）。句読点で分割できない場合はそのまま表示

## 台本のnarrationタグ体系
- ElevenLabs用（音声に影響）：`[calmly]` `[cheerfully]` `[pause]`
- ※`[pause]`はElevenLabsに渡す前に除去・ffmpegの無音追加で代替
- Remotion用（表示に影響）：`【強調キーワード】`
- 処理の分岐：
  - generate_audio.js → [pause]除去・【】の中身を残して音声読み上げ・（）を除去・発音置換
  - Composition.tsx → []を除去・【】をパースして強調表示

## 既知の問題・改善点
- YouTubeのコメント投稿APIは予約投稿動画には使えないため手動で固定コメントを貼り付ける（Discordに自動送信済み）
- ffmpegパス：`C:\Users\elfka\OneDrive\デスクトップ\ffmpeg-8.1-essentials_build\bin`
- remotion/public/のscript.jsonとvideo-bot/output/のscript.jsonを混同しないよう注意
- @remotion/google-fontsのバージョンが他のremotionパッケージと1つずれている（動作には影響なし）

## 次にやること（優先順位順）
- [ ] 動画の長さを25秒以内に収める調整
- [ ] 伏せ字フックの強化（プロンプト調整）
- [ ] 効果音の挿入（シーン切り替わり時）※良い音源が見つかり次第
- [ ] アフィリエイトリンクの自動選定・貼り付け
- [ ] ギンバトキャラのLINEスタンプ作成・販売
- [ ] TikTok審査承認後：privacy_levelをPUBLIC_TO_EVERYONEに変更・upload_youtube.jsと連携
- [ ] 効果音の挿入（シーン切り替わり時）※良い音源が見つかり次第
- [ ] アフィリエイトリンクの自動選定・貼り付け
- [ ] ギンバトキャラのLINEスタンプ作成・販売

## Claudeへのお願い
- コーディング初心者なので、1ステップずつ丁寧に指示を出してください
- コマンドはそのままコピペできる形で提示してください
- エラーが出たら原因を簡単に説明してから解決策を提示してください
- 変更前と変更後のコードは必ず別々のコードブロックに分けて提示してください
- 編集するファイルのフォルダパスも必ず明示してください
- 作業の進捗をこまめに確認しながら進めてください
- わかりにくい部分は完成形のコードを提示してください

## Claude Code Companyの運用方法
1. upload_youtube.js実行後にDiscordに分析結果が通知される
2. output/analytics_analysis.txtをClaude Codeに渡す
3. Claude Codeに改善を依頼する
4. Claude Codeがブランチを作成して実装する（ブランチ名：improvement/xxxx）
5. 動作確認してOKならマージ・NGならブランチ削除
   - マージ：「improvement/xxxxをmainにマージしてください」
   - キャンセル：「improvement/xxxxブランチを削除してください」