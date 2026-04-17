require("dotenv").config();
const fs = require("fs");
const path = require("path");
const https = require("https");

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

async function generateImagePrompts(scriptData) {
  const characterPrompt = fs.readFileSync("prompts/character_prompt.txt", "utf8").trim();

  const scenes = scriptData.scenes.map(
    (s) => `シーン${s.scene_number}：${s.narration}`
  ).join("\n");

  const body = JSON.stringify({
    contents: [{
      parts: [{
        text: `以下のショート動画の各シーンに合った画像を生成するための英語プロンプトを作成してください。

キャラクター設定（必ず毎シーン同じキャラクターを使用すること）：
${characterPrompt}

各シーンでこのキャラクターがナレーションの内容に合ったポーズや表情・小道具を持っている場面を描写してください。
背景はシーンの内容に合ったカラフルでポップな背景にしてください。

【構図のルール】
各シーンに以下の構図をランダムに割り当てて、動画全体に変化をつけてください：
- front view（正面・全身）
- back view（後ろ姿・全身）
- front view（正面・全身）
- back view（完全に後ろを向いている・顔は見えない）
- extreme close-up（顔のドアップ・画面全体に顔が広がるくらい大きく・目や嘴がはっきり見える）
- wide shot（引きの構図・キャラクターが画面の4分の1程度の大きさ・背景を広く見せる・「tiny character in a wide environment」）
- side view（横からの全身・顔はやや横向きでもOK）
4シーンで同じ構図が2回以上使われないように調整してください。
back viewの場合は「facing away from viewer, back turned」をプロンプトに必ず含めてください。

各シーンのプロンプトはJSON配列で返してください。余計な説明や\`\`\`は不要です。

${scenes}

出力形式：
["シーン1の英語プロンプト", "シーン2の英語プロンプト", ...]`
      }]
    }],
    generationConfig: { temperature: 0.7 }
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
          const text = result.candidates[0].content.parts[0].text
            .replace(/```json\n?|\n?```/g, "").trim();
          resolve(JSON.parse(text));
        } catch (err) {
          reject(new Error("プロンプト生成失敗: " + data));
        }
      });
    });
    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

async function generateImage(prompt, outputPath) {
  const body = JSON.stringify({
    contents: [{
      parts: [{
        text: `Generate a vertical 9:16 aspect ratio image for a short video. ${prompt}`
      }]
    }],
    generationConfig: { responseModalities: ["IMAGE", "TEXT"] }
  });

  return new Promise((resolve, reject) => {
    const options = {
      hostname: "generativelanguage.googleapis.com",
      path: `/v1beta/models/gemini-3.1-flash-image-preview:generateContent?key=${GEMINI_API_KEY}`,
      method: "POST",
      headers: { "Content-Type": "application/json" },
      timeout: 120000,
    };

    const req = https.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try {
          const result = JSON.parse(data);
          const parts = result.candidates[0].content.parts;
          for (const part of parts) {
            if (part.inlineData) {
              const imageData = Buffer.from(part.inlineData.data, "base64");
              fs.writeFileSync(outputPath, imageData);
              resolve(true);
              return;
            }
          }
          console.log("⚠️ 画像データが含まれていません:", JSON.stringify(result).substring(0, 200));
          resolve(false);
        } catch (err) {
          reject(new Error("画像生成失敗: " + data.substring(0, 200)));
        }
      });
    });
    req.on("error", reject);
    req.on("timeout", () => {
      req.destroy();
      reject(new Error("タイムアウト"));
    });
    req.write(body);
    req.end();
  });
}

async function generateAllImages() {
  const scriptData = JSON.parse(
    fs.readFileSync("output/script.json", "utf8")
  );

  const imageDir = path.join("remotion", "public", "images");
  if (!fs.existsSync(imageDir)) {
    fs.mkdirSync(imageDir, { recursive: true });
  }

  console.log("🤖 画像プロンプトを生成しています...");
  const prompts = await generateImagePrompts(scriptData);
  console.log("✅ プロンプト生成完了！");

// プロンプトをファイルに保存
  const promptsLog = scriptData.scenes.map((s, i) => `シーン${s.scene_number}：${prompts[i]}`).join("\n\n");
  fs.writeFileSync("output/image_prompts.txt", promptsLog);
  console.log("✅ プロンプトを output/image_prompts.txt に保存しました。");

  const onlyScenes = process.argv.includes("--scenes") && fs.existsSync("output/regenerate_scenes.txt")
    ? fs.readFileSync("output/regenerate_scenes.txt", "utf8").split(",").map(n => parseInt(n.trim()))
    : null;

  for (let i = 0; i < scriptData.scenes.length; i++) {
    const scene = scriptData.scenes[i];
    if (onlyScenes && !onlyScenes.includes(scene.scene_number)) {
      console.log(`⏭️ シーン${scene.scene_number}はスキップします`);
      continue;
    }
    const prompt = prompts[i];
    const outputPath = path.join(imageDir, `scene_${scene.scene_number}.png`);

    console.log(`🎨 シーン${scene.scene_number}の画像を生成中...`);

    let success = false;
    for (let retry = 0; retry < 3; retry++) {
      try {
        if (retry > 0) {
          console.log(`🔄 リトライ中... (${retry}回目)`);
          await new Promise(r => setTimeout(r, 5000));
        }
        success = await generateImage(prompt, outputPath);
        if (success) {
          console.log(`✅ シーン${scene.scene_number} → images/scene_${scene.scene_number}.png`);
          break;
        }
      } catch (err) {
        console.error(`❌ シーン${scene.scene_number}エラー:`, err.message);
      }
    }
    if (!success) {
      console.log(`⚠️ シーン${scene.scene_number}はスキップしました`);
    }
  }

  console.log("\n🎉 完了！");
}

generateAllImages();