require("dotenv").config();
const { Client, GatewayIntentBits } = require("discord.js");
const { execSync } = require("child_process");
const https = require("https");
const fs = require("fs");
const path = require("path");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
let currentThemes = [];
let waitingForSelection = false;
let targetChannel = null;

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

  } catch (err) {
    await channel.send(`❌ エラーが発生しました：${err.message}`);
  }
}

client.on("ready", () => {
  console.log(`✅ ${client.user.tag} としてログインしました！`);
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
      await runPipeline(selected, message.channel);
    }
  }
});

client.login(process.env.DISCORD_TOKEN);
console.log("🚀 Discordボット起動中...");