require("dotenv").config();
const https = require("https");
const readline = require("readline");
const fs = require("fs");

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

async function generateThemes() {
  const body = JSON.stringify({
    contents: [{
      parts: [{
        text: `あなたはYouTubeショート動画のテーマ選定の専門家です。
直近1ヵ月のYoutubeで50万回以上再生されているショート動画を参考に、現在SNSでバズりやすい「○○3選」形式のショート動画テーマを5つ提案してください。

条件：
- 20〜30代の日本人に刺さるテーマ
- 「知らなかった」「やってみたい」と思わせる内容
- 生活習慣・健康・お金・人間関係・仕事などのジャンル
- タイトルは「○○3選」または「○○な人の特徴3選」などの形式
- 視聴者の常識を覆す意外な切り口を含む

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
          reject(new Error("テーマ生成失敗: " + data.substring(0, 200)));
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

  // 選んだテーマを一時ファイルに保存
  fs.writeFileSync("output/selected_theme.txt", theme);
  console.log(`\n📝 テーマを保存しました: output/selected_theme.txt`);
  console.log("次のステップ: node generate_script.js を実行してください");
}

main();