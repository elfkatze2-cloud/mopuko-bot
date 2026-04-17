require("dotenv").config();
const { Client, GatewayIntentBits } = require("discord.js");
const { execSync } = require("child_process");
const https = require("https");
const fs = require("fs");
const path = require("path");
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

const HISTORY_FILE = path.join(__dirname, "output", "theme_history.json");

function loadHistory() {
  if (!fs.existsSync(HISTORY_FILE)) return [];
  return JSON.parse(fs.readFileSync(HISTORY_FILE, "utf8"));
}

function saveHistory(theme) {
  const history = loadHistory();
  history.push({
    theme,
    date: new Date().toISOString().split("T")[0],
  });
  const recent = history.slice(-30);
  fs.writeFileSync(HISTORY_FILE, JSON.stringify(recent, null, 2));
}

function getRecentThemes(days) {
  const history = loadHistory();
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  return history
    .filter((h) => new Date(h.date) >= cutoff)
    .map((h) => h.theme);
}

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

async function generateThemes() {
  const last15 = getRecentThemes(15);
  const last7 = getRecentThemes(7);
  const last3 = getRecentThemes(3);
  const genreCount = getGenreCount();
  const minGenre = Object.entries(genreCount).sort((a, b) => a[1] - b[1])[0][0];

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

【重要なルール】
- 以下のテーマは直近15日間で使用済みのため絶対に避けてください：
${last15.length > 0 ? last15.map((t) => `  ・${t}`).join("\n") : "  なし"}

- 以下のテーマと似たジャンル・キーワードは直近7日間で使用済みのため避けてください：
${last7.length > 0 ? last7.map((t) => `  ・${t}`).join("\n") : "  なし"}

- 以下のテーマと似た内容は直近3日間で使用済みのため特に避けてください：
${last3.length > 0 ? last3.map((t) => `  ・${t}`).join("\n") : "  なし"}

- 今月不足しているジャンル「${minGenre}」を少なくとも1つ含めてください
- 同じジャンルは2つまでにしてください
- 季節や時事ネタも積極的に取り入れてください

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

async function runPipeline(theme, channel) {
  try {
    await channel.send(`📝 テーマ「${theme}」で動画制作を開始します！`);

    // selected_theme.txtに保存
    fs.writeFileSync(
      path.join(__dirname, "output", "selected_theme.txt"),
      theme
    );

    saveHistory(theme);

    await channel.send("🤖 台本を生成しています...");
    execSync("node generate_script.js", { stdio: "inherit" });

    await channel.send("✅ 台本の検証・整形中...");
    execSync("node validate_script.js", { stdio: "inherit" });

    await channel.send("🎙️ 音声を生成しています...");
    execSync("node generate_audio.js", { stdio: "inherit" });

    await channel.send("⚡ 音声を1.3倍速に変換しています...");
    execSync("python speed_up_audio.py", { stdio: "inherit" });

    await channel.send("⏱️ 音声の長さを取得しています...");
    execSync("python get_audio_duration.py", { stdio: "inherit" });

    await channel.send("🎨 背景画像を生成しています...");
    execSync("node generate_images.js", { stdio: "inherit" });

    await channel.send("📂 ファイルをコピーしています...");

    // ファイルコピー処理
    const srcAudioDir = path.join(__dirname, "output", "audio");
    const dstAudioDir = path.join(__dirname, "remotion", "public", "audio");
    const srcScript = path.join(__dirname, "output", "script.json");
    const dstScript = path.join(__dirname, "remotion", "public", "script.json");
    const srcDurations = path.join(__dirname, "output", "audio_durations.json");
    const dstDurations = path.join(__dirname, "remotion", "public", "audio_durations.json");

    if (!fs.existsSync(dstAudioDir)) fs.mkdirSync(dstAudioDir, { recursive: true });
    fs.copyFileSync(srcScript, dstScript);
    fs.copyFileSync(srcDurations, dstDurations);
    const audioFiles = fs.readdirSync(srcAudioDir).filter(f => f.endsWith(".mp3"));
    audioFiles.forEach(file => {
      fs.copyFileSync(path.join(srcAudioDir, file), path.join(dstAudioDir, file));
    });

    await channel.send("🎥 動画を合成しています...（数分かかります）");
    execSync(
      "npx remotion render MyComp output.mp4 --codec h264 --crf 18 --timeout 240000",
      { stdio: "inherit", cwd: path.join(__dirname, "remotion") }
    );

    await channel.send("📤 YouTubeにアップロードしています...");
    execSync("node upload_youtube.js", { stdio: "inherit" });

    await channel.send("🎉 完了！YouTubeにアップロードされました！");
    
    // 固定コメントをDiscordに送信
    const fs = require("fs");
    const commentPath = require("path").join(__dirname, "output", "fixed_comment.txt");
    if (fs.existsSync(commentPath)) {
      const comment = fs.readFileSync(commentPath, "utf8");
      await channel.send("📌 以下のコメントをYouTubeに固定してください：\n```\n" + comment + "\n```");
    }

  } catch (err) {
    await channel.send(`❌ エラーが発生しました：${err.message}`);
  }
}

const CHANNEL_ID = "1220339816877789197";

client.on("ready", async () => {
  console.log(`✅ ${client.user.tag} としてログインしました！`);
  
  // 起動時に自動でテーマ候補を送信
  try {
    const channel = await client.channels.fetch(CHANNEL_ID);
    targetChannel = channel;
    waitingForSelection = true;
    
    await channel.send("🌅 おはようございます！今日のテーマ候補を生成しています...");
    
    currentThemes = await generateThemes();
    let reply = "📋 今日のテーマ候補：\n\n";
    currentThemes.forEach((theme, i) => {
      reply += `${i + 1}. ${theme}\n`;
    });
    reply += "\n番号を入力してください（0: もう一度生成）";
    await channel.send(reply);
  } catch (err) {
    console.error("起動時のテーマ送信に失敗しました:", err.message);
  }
});

client.on("messageCreate", async (message) => {
  if (message.author.bot) return;

  // !theme コマンドでテーマ候補を生成
  if (message.content === "!theme") {
    waitingForSelection = true;
    targetChannel = message.channel;
    await message.channel.send("🤖 テーマ候補を生成しています...");

    try {
      currentThemes = await generateThemes();
      let reply = "📋 テーマ候補：\n\n";
      currentThemes.forEach((theme, i) => {
        reply += `${i + 1}. ${theme}\n`;
      });
      reply += "\n番号を入力してください（0: もう一度生成）";
      await message.channel.send(reply);
    } catch (err) {
      await message.channel.send(`❌ エラー：${err.message}`);
      waitingForSelection = false;
    }
    return;
  }

  // 番号入力待ち状態の場合
  if (waitingForSelection && targetChannel) {
    const num = parseInt(message.content);

    if (message.content === "0") {
      await message.channel.send("🔄 もう一度生成します...");
      try {
        currentThemes = await generateThemes();
        let reply = "📋 テーマ候補：\n\n";
        currentThemes.forEach((theme, i) => {
          reply += `${i + 1}. ${theme}\n`;
        });
        reply += "\n番号を入力してください（0: もう一度生成）";
        await message.channel.send(reply);
      } catch (err) {
        await message.channel.send(`❌ エラー：${err.message}`);
      }
      return;
    }

    if (num >= 1 && num <= currentThemes.length) {
      const selected = currentThemes[num - 1];
      waitingForSelection = false;
      currentThemes = [];
      await runPipeline(selected, message.channel);
      // 完了後に次のテーマ候補を自動送信
      waitingForSelection = true;
      targetChannel = message.channel;
      await message.channel.send("🤖 次のテーマ候補を生成しています...");
      try {
        currentThemes = await generateThemes();
        let reply = "📋 次のテーマ候補：\n\n";
        currentThemes.forEach((theme, i) => {
          reply += `${i + 1}. ${theme}\n`;
        });
        reply += "\n番号を入力してください（0: もう一度生成 / !theme で再生成）";
        await message.channel.send(reply);
      } catch (err) {
        await message.channel.send(`❌ テーマ生成エラー：${err.message}`);
        waitingForSelection = false;
      }
    }
  }
});

client.login(process.env.DISCORD_TOKEN);
console.log("🚀 Discordボット起動中...");