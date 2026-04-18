require("dotenv").config();
const { GoogleGenerativeAI } = require("@google/generative-ai");
const fs = require("fs");
const path = require("path");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function analyzeAnalytics() {
  const reportPath = path.join(__dirname, "output", "analytics_report.json");
  if (!fs.existsSync(reportPath)) {
    console.error("❌ analytics_report.jsonが見つかりません。先にfetch_analytics.jsを実行してください。");
    process.exit(1);
  }

  const report = JSON.parse(fs.readFileSync(reportPath, "utf-8"));

  console.log("🤖 Geminiで分析中...");

  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

  const prompt = `
あなたはYouTubeショート動画チャンネルのアナリストです。
以下のデータを分析して、改善案を提案してください。

## チャンネル情報
- チャンネル名：おりこうもぷ子
- ターゲット：20〜40代の日本人
- ジャンル：雑学・生活改善・習慣・豆知識系ショート動画
- 動画尺：25秒以内のショート動画
- 構成：シーン1がフック、シーン2〜4が「○○3選」形式

## 分析期間
${report.period.start} 〜 ${report.period.end}

## チャンネル全体の指標
- 総再生数：${report.channelOverall.data[0]}
- 推定視聴時間：${report.channelOverall.data[1]}分
- 平均視聴時間：${report.channelOverall.data[2]}秒
- 平均視聴率：${report.channelOverall.data[3].toFixed(1)}%
- 新規登録者：${report.channelOverall.data[4]}人
- 登録解除：${report.channelOverall.data[5]}人

## 各動画のパフォーマンス
${report.videos
  .map(
    (v) => `
### ${v.title}
- 投稿日時：${v.publishedAt}
- 再生数：${v.views}
- いいね：${v.likes}
- コメント：${v.comments}
${v.averageViewDuration !== undefined ? `- 平均視聴時間：${v.averageViewDuration}秒` : "- 平均視聴時間：集計中"}
${v.averageViewPercentage !== undefined ? `- 視聴維持率：${v.averageViewPercentage.toFixed(1)}%` : "- 視聴維持率：集計中"}
`
  )
  .join("")}

## 出力形式
以下の3セクションで回答してください。

### 1. パフォーマンス分析
どの動画が良く・悪かったか、その理由の仮説。

### 2. 成功パターン
伸びている動画に共通するタイトル・テーマ・構成の傾向。

### 3. 改善提案（優先度順）
動画の演出・構成・タイトル・投稿時間など改善すべき点を優先度順にリストアップしてください。
各提案には以下を含めてください：
- 改善内容：何をどう変えるか
- 期待効果：なぜ効果があるか
- 実装難易度：高・中・低

日本語で、具体的かつ実践的に回答してください。
`;

  const result = await model.generateContent(prompt);
  const analysis = result.response.text();

  console.log("\n📊 分析結果：\n");
  console.log(analysis);

  // 分析結果を保存
  const outputPath = path.join(__dirname, "output", "analytics_analysis.txt");
  fs.writeFileSync(outputPath, analysis, "utf-8");
  console.log(`\n✅ 分析結果を保存しました：${outputPath}`);

  // 2段階目：改善案を9つにまとめてJSON化
  console.log("\n🤖 改善案をまとめています...");
  const summaryPrompt = `
以下の分析レポートをもとに、優先度と実装難易度を考慮して改善案を最大9つ抽出してください。

${analysis}

以下のJSON形式のみで返してください。余計な説明や\`\`\`は不要です。

[
  {
    "id": 1,
    "title": "改善案の短いタイトル（20文字以内）",
    "detail": "具体的に何をどう変えるかの説明（100文字以内）",
    "priority": "高・中・低のいずれか",
    "difficulty": "高・中・低のいずれか"
  }
]
`;

  const summaryResult = await model.generateContent(summaryPrompt);
  const summaryText = summaryResult.response.text().trim();

  try {
    const match = summaryText.match(/\[[\s\S]*\]/);
    if (!match) throw new Error("JSON配列が見つかりません");
    const improvements = JSON.parse(match[0]);

    const improvementsPath = path.join(__dirname, "output", "improvements.json");
    fs.writeFileSync(improvementsPath, JSON.stringify(improvements, null, 2), "utf-8");
    console.log(`✅ 改善案を保存しました：${improvementsPath}`);
  } catch (err) {
    console.error("❌ 改善案のJSON化に失敗しました:", err.message);
  }

  return analysis;
}

analyzeAnalytics().catch(console.error);