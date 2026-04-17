require("dotenv").config();
const https = require("https");
const readline = require("readline");
const fs = require("fs");
const path = require("path");

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const HISTORY_FILE = path.join(__dirname, "output", "theme_history.json");

// テーマ履歴の読み込み
function loadHistory() {
  if (!fs.existsSync(HISTORY_FILE)) return [];
  return JSON.parse(fs.readFileSync(HISTORY_FILE, "utf8"));
}

// テーマ履歴の保存
function saveHistory(theme) {
  const history = loadHistory();
  history.push({
    theme,
    date: new Date().toISOString().split("T")[0],
  });
  // 30日分だけ保持
  const recent = history.slice(-30);
  fs.writeFileSync(HISTORY_FILE, JSON.stringify(recent, null, 2));
}

// 直近N日のテーマを取得
function getRecentThemes(days) {
  const history = loadHistory();
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  return history
    .filter((h) => new Date(h.date) >= cutoff)
    .map((h) => h.theme);
}

// ジャンル集計
function getGenreCount() {
  const history = loadHistory();
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 30);
  const recent = history.filter((h) => new Date(h.date) >= cutoff);
  const genres = { 健康: 0, お金: 0, 人間関係: 0, 仕事: 0, 生活: 0 };
  recent.forEach((h) => {
    if (h.genre) genres[h.genre] = (genres[h.genre] || 0) + 1;
  });
  return genres;
}

function getJapaneseSeason() {
  const month = new Date().getMonth() + 1;
  if (month >= 3 && month <= 5) return "春（3〜5月）";
  if (month >= 6 && month <= 8) return "夏（6〜8月）";
  if (month >= 9 && month <= 11) return "秋（9〜11月）";
  return "冬（12〜2月）";
}

function loadAnalyticsInsight() {
  const reportPath = path.join(__dirname, "output", "analytics_report.json");
  if (!fs.existsSync(reportPath)) return null;
  const report = JSON.parse(fs.readFileSync(reportPath, "utf8"));
  if (!report.videos || report.videos.length === 0) return null;

  const videos = report.videos;
  const top = videos[0];
  const bottom = videos[videos.length - 1];

  return `
【自チャンネルの直近パフォーマンス】
- 最も伸びた動画：「${top.title}」（再生数${top.views}・いいね${top.likes}）
- 最も伸びなかった動画：「${bottom.title}」（再生数${bottom.views}・いいね${bottom.likes}）
- 全動画の平均再生数：${Math.round(videos.reduce((s, v) => s + v.views, 0) / videos.length)}
このデータを参考に、伸びやすいテーマを選んでください。`;
}

async function generateThemes() {
  const slot = fs.existsSync(path.join(__dirname, "output", "slot.txt"))
    ? fs.readFileSync(path.join(__dirname, "output", "slot.txt"), "utf8").trim()
    : "evening";
  const isMorning = slot === "morning";

  const last15 = getRecentThemes(15);
  const last7 = getRecentThemes(7);
  const last3 = getRecentThemes(3);
  const genreCount = getGenreCount();

  // 不足ジャンルを特定
  const minGenre = Object.entries(genreCount).sort((a, b) => a[1] - b[1])[0][0];

  const morningCondition = `- 朝に見てすぐ行動できる・試せる内容にする
- モーニングルーティン・仕事の生産性・メンタル強化・朝から元気になれる応援系テーマ
- 見た人が「今日やってみよう！」「今日も頑張ろう！」と思えるポジティブなテーマ
- 重い内容・暗い内容・夜向けの内容は避ける`;

  const eveningCondition = `- 生活習慣・健康・お金・人間関係・仕事などのジャンル`;

  const body = JSON.stringify({
    contents: [{
      parts: [{
        text: `あなたはYouTubeショート動画のテーマ選定の専門家です。
直近1ヵ月のYoutubeで50万回以上再生されているショート動画を参考に、現在SNSでバズりやすい「○○3選」形式のショート動画テーマを5つ提案してください。

条件：
- 20〜30代の日本人に刺さるテーマ
- 「知らなかった」「やってみたい」と思わせる内容
${isMorning ? morningCondition : eveningCondition}
- タイトルは「○○3選」または「○○な人の特徴3選」などの形式
- 視聴者の常識を覆す意外な切り口を含む

【重要なルール】
- 以下のテーマは直近15日間で使用済みのため絶対に避けてください：
${last15.length > 0 ? last15.map((t) => `  ・${t}`).join("\n") : "  なし"}

- 以下のテーマと似たジャンル・キーワードは直近7日間で使用済みのため避けてください：
${last7.length > 0 ? last7.map((t) => `  ・${t}`).join("\n") : "  なし"}

- 以下のテーマと似た内容は直近3日間で使用済みのため特に避けてください：
${last3.length > 0 ? last3.map((t) => `  ・${t}`).join("\n") : "  なし"}

- 今月不足しているジャンル「${minGenre}」を少なくとも1つ含めてください
- 同じジャンルは2つまでにしてください
- 現在の季節は「${getJapaneseSeason()}」です。季節に合ったテーマを積極的に取り入れてください
${loadAnalyticsInsight() ? loadAnalyticsInsight() : ""}

必ずJSON配列のみを返してください。余計な説明や\`\`\`は不要です。

["テーマ1", "テーマ2", "テーマ3", "テーマ4", "テーマ5"]`
      }]
    }],
    generationConfig: { temperature: 0.9 }
  });

  return new Promise((resolve, reject) => {
    const options = {
      hostname: "generativelanguage.googleapis.com",
      path: `/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      method: "POST",
      headers: { "Content-Type": "application/json" },
    };

    const req = https.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try {
          const result = JSON.parse(data);
          const rawText = result.candidates[0].content.parts[0].text
            .replace(/```json\n?|\n?```/g, "").trim();
          const match = rawText.match(/\[[\s\S]*\]/);
          if (!match) throw new Error("JSON配列が見つかりません");
          resolve(JSON.parse(match[0]));
        } catch (err) {
          reject(new Error("テーマ生成失敗: " + err.message));
        }
      });
    });
    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

async function selectTheme() {
  console.log("🤖 バズりそうなテーマを生成しています...\n");
  const themes = await generateThemes();

  console.log("📋 テーマ候補：");
  themes.forEach((theme, i) => {
    console.log(`  ${i + 1}. ${theme}`);
  });

  console.log("\n0. もう一度生成する");
  console.log("q. 終了\n");

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question("番号を入力してください: ", async (answer) => {
      rl.close();

      if (answer === "q") {
        console.log("終了します。");
        resolve(null);
        return;
      }

      if (answer === "0") {
        resolve(await selectTheme());
        return;
      }

      const index = parseInt(answer) - 1;
      if (index >= 0 && index < themes.length) {
        const selected = themes[index];
        console.log(`\n✅ 選択したテーマ：${selected}`);
        saveHistory(selected);
        resolve(selected);
      } else {
        console.log("無効な番号です。もう一度試してください。");
        resolve(await selectTheme());
      }
    });
  });
}

async function main() {
  const theme = await selectTheme();
  if (!theme) return;

  fs.writeFileSync("output/selected_theme.txt", theme);
  console.log(`\n📝 テーマを保存しました: output/selected_theme.txt`);
  console.log("次のステップ: node generate_script.js を実行してください");
}

main();