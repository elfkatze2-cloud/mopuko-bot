require("dotenv").config();
const { google } = require("googleapis");
const fs = require("fs");
const path = require("path");
const { authenticate } = require("./auth_youtube");
const https = require("https");

function getPublishTime(slot) {
  const now = new Date();
  const jstOffset = 9 * 60 * 60 * 1000;
  const jstNow = new Date(now.getTime() + jstOffset);

  let targetDate = new Date(jstNow);
  const targetHour = slot === "morning" ? 7 : 20;
  targetDate.setUTCHours(targetHour, 0, 0, 0);

  // 既に過ぎていたら翌日に設定
  if (targetDate <= jstNow) {
    targetDate.setUTCDate(targetDate.getUTCDate() + 1);
  }

  const utc = new Date(targetDate.getTime() - jstOffset);

  console.log(`📅 予約投稿時刻：${targetDate.toISOString().replace('T', ' ').slice(0, 16)} (JST)`);
  console.log(`UTC時刻：${utc.toISOString()}`);
  console.log(`現在UTC：${now.toISOString()}`);

  return utc.toISOString();
}

async function generateComment(title, postText) {
  const body = JSON.stringify({
    contents: [{
      parts: [{
        text: `あなたはYouTubeチャンネル「おりこうもぷ子」の運営者です。
以下の動画タイトルと投稿文をもとに、コメント欄に固定する「どっち派？」形式のコメントを1つ生成してください。

【動画タイトル】
${title}

【投稿文】
${postText}

【コメントの条件】
- 動画テーマに関連した、好みが分かれる二択の質問を投げる
- 「今日から君もおりこうだね！」で始める
- 絵文字を使って親しみやすくする
- 「もぷ子は実は……秘密！みんなの回答が多い方を、次の動画のヒントにするかも！」で締める
- 全体で100文字以内
- テキストのみ返してください。余計な説明は不要です。`
      }]
    }],
    generationConfig: { temperature: 0.9 }
  });

  return new Promise((resolve, reject) => {
    const options = {
      hostname: "generativelanguage.googleapis.com",
      path: `/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      method: "POST",
      headers: { "Content-Type": "application/json" },
    };

    const req = https.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try {
          const result = JSON.parse(data);
          const comment = result.candidates[0].content.parts[0].text.trim();
if (comment.length > 200) {
  throw new Error("コメントが異常に長いです");
}
console.log("💬 生成されたコメント：", comment);
resolve(comment);
        } catch (err) {
          console.error("❌ コメント生成失敗:", err.message);
          resolve("今日から君もおりこうだね！🌸 みんなはどっち派？コメントで教えてね！");
        }
      });
    });
    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

async function postComment(youtube, videoId, comment) {
  try {
    const response = await youtube.commentThreads.insert({
      part: ["snippet"],
      requestBody: {
        snippet: {
          videoId: videoId,
          topLevelComment: {
            snippet: {
              textOriginal: comment,
            },
          },
        },
      },
    });
    console.log("✅ コメント投稿完了！");

    // コメントを固定
    await youtube.comments.setModerationStatus({
      id: response.data.snippet.topLevelComment.id,
      moderationStatus: "published",
    });
    console.log("📌 コメントを固定しました！");
  } catch (err) {
    console.error("❌ コメント投稿失敗:", err.message);
  }
}

async function uploadVideo() {
  // 認証
  const auth = await authenticate();
  const youtube = google.youtube({ version: "v3", auth });

  // script.jsonから投稿文を読み込む
  const scriptData = JSON.parse(fs.readFileSync("output/script.json", "utf8"));
  const title = scriptData.title;
  const description = scriptData.post_text;

  // 動画ファイルのパス
  const videoPath = path.join(
    "C:\\Users\\elfka\\OneDrive\\デスクトップ\\video-bot\\remotion\\output.mp4"
  );

  if (!fs.existsSync(videoPath)) {
    console.error("❌ 動画ファイルが見つかりません：", videoPath);
    process.exit(1);
  }

  const slot = fs.existsSync("output/slot.txt")
    ? fs.readFileSync("output/slot.txt", "utf8").trim()
    : "evening";
  const publishAt = getPublishTime(slot);

  console.log("📤 YouTubeにアップロード中...");
  console.log("タイトル：", title);

  const response = await youtube.videos.insert({
    part: ["snippet", "status"],
    requestBody: {
      snippet: {
        title: title + " #Shorts",
        description: description,
        tags: ["ショート動画", "shorts"],
        categoryId: "22",
        defaultLanguage: "ja",
      },
      status: {
        privacyStatus: "private",
        selfDeclaredMadeForKids: false,
        publishAt,
      },
    },
    media: {
      body: fs.createReadStream(videoPath),
    },
  });

  console.log("✅ アップロード完了！");
  console.log("動画ID：", response.data.id);
  console.log(
    "URL：",
    `https://www.youtube.com/watch?v=${response.data.id}`
  );

  // アップロード完了後にテーマ履歴を保存
  const selectedThemePath = path.join(__dirname, "output", "selected_theme.txt");
  if (fs.existsSync(selectedThemePath)) {
    const theme = fs.readFileSync(selectedThemePath, "utf8").trim();
    const historyPath = path.join(__dirname, "output", "theme_history.json");
    const history = fs.existsSync(historyPath)
      ? JSON.parse(fs.readFileSync(historyPath, "utf8"))
      : [];
    history.push({
      theme,
      date: new Date().toISOString().split("T")[0],
    });
    const recent = history.slice(-30);
    fs.writeFileSync(historyPath, JSON.stringify(recent, null, 2));
    console.log(`✅ テーマ履歴を保存しました：${theme}`);
  }

  const videoUrl = `https://www.youtube.com/watch?v=${response.data.id}`;

  const commentMode = fs.existsSync("output/comment_mode.txt")
    ? fs.readFileSync("output/comment_mode.txt", "utf8").trim()
    : "normal";

  if (commentMode === "guide") {
    // guideモード：3つ目の内容をDiscordに送信
    const scene4Content = scriptData.scene4_content || "(内容取得失敗)";
    console.log(`\n📝 コメント欄用3つ目：${scene4Content}`);

    const discordMessage = JSON.stringify({
      content: `📝 **コメント欄用3つ目：${scene4Content}**\n🎬 動画URL：${videoUrl}`,
    });

    await new Promise((resolve) => {
      const webhookUrl = new URL(process.env.DISCORD_WEBHOOK_URL);
      const options = {
        hostname: webhookUrl.hostname,
        path: webhookUrl.pathname,
        method: "POST",
        headers: { "Content-Type": "application/json" },
      };
      const req = https.request(options, (res) => {
        res.on("data", () => {});
        res.on("end", () => {
          console.log("✅ Discordにコメント欄用3つ目を送信しました！");
          resolve();
        });
      });
      req.on("error", (err) => {
        console.error("❌ Discord送信失敗:", err.message);
        resolve();
      });
      req.write(discordMessage);
      req.end();
    });
  } else {
    // normalモード：2択の固定コメントを生成してDiscordに送信
    const comment = await generateComment(scriptData.title, scriptData.post_text);
    console.log("\n📌 以下のコメントをYouTubeに固定してください：");
    console.log("─────────────────────────────");
    console.log(comment);
    console.log("─────────────────────────────");

    fs.writeFileSync("output/fixed_comment.txt", comment);
    console.log("💾 output/fixed_comment.txt に保存しました");

    const discordMessage = JSON.stringify({
      content: `📌 **固定コメント**\n\`\`\`\n${comment}\n\`\`\`\n🎬 動画URL：${videoUrl}`,
    });

    await new Promise((resolve) => {
      const webhookUrl = new URL(process.env.DISCORD_WEBHOOK_URL);
      const options = {
        hostname: webhookUrl.hostname,
        path: webhookUrl.pathname,
        method: "POST",
        headers: { "Content-Type": "application/json" },
      };
      const req = https.request(options, (res) => {
        res.on("data", () => {});
        res.on("end", () => {
          console.log("✅ Discordに固定コメントを送信しました！");
          resolve();
        });
      });
      req.on("error", (err) => {
        console.error("❌ Discord送信失敗:", err.message);
        resolve();
      });
      req.write(discordMessage);
      req.end();
    });
  }
}

async function runAnalysis() {
  console.log("\n📊 アナリティクスを取得・分析中...");
  try {
    await new Promise((resolve, reject) => {
      const { execSync } = require("child_process");
      try {
        execSync("node fetch_analytics.js", { stdio: "inherit" });
        execSync("node analyze_analytics.js", { stdio: "inherit" });
        resolve();
      } catch (err) {
        reject(err);
      }
    });

    // 分析完了をDiscordに通知
    const analysisText = fs.readFileSync("output/analytics_analysis.txt", "utf-8");
    const preview = analysisText.slice(0, 500) + (analysisText.length > 500 ? "…" : "");

    const discordMessage = JSON.stringify({
      content: `📈 **分析完了！**\n\`\`\`\n${preview}\n\`\`\`\n💡 詳細は \`output/analytics_analysis.txt\` を確認してClaude Codeに渡してください。`,
    });

    await new Promise((resolve) => {
      const webhookUrl = new URL(process.env.DISCORD_WEBHOOK_URL);
      const options = {
        hostname: webhookUrl.hostname,
        path: webhookUrl.pathname,
        method: "POST",
        headers: { "Content-Type": "application/json" },
      };
      const req = https.request(options, (res) => {
        res.on("data", () => {});
        res.on("end", () => {
          console.log("✅ Discordに分析結果を送信しました！");
          resolve();
        });
      });
      req.on("error", (err) => {
        console.error("❌ Discord送信失敗:", err.message);
        resolve();
      });
      req.write(discordMessage);
      req.end();
    });
  } catch (err) {
    console.error("❌ 分析失敗:", err.message);
  }
}

async function main() {
  await uploadVideo();
  await runAnalysis();
}

main();