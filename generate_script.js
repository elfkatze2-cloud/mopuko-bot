require("dotenv").config();
const Anthropic = require("@anthropic-ai/sdk");
const fs = require("fs");

const client = new Anthropic();

async function generateScript(topic, retryCount = 0) {
  const systemPrompt = fs.readFileSync("prompts/system_prompt.txt", "utf8");

  if (retryCount > 0) {
    console.log(`🔄 再生成中... (${retryCount}回目)`);
  }

  console.log("Claudeに台本を生成してもらっています...");

  const response = await client.messages.create({
    model: "claude-opus-4-5",
    max_tokens: 2000,
    system: systemPrompt,
    messages: [
      {
        role: "user",
        content: `テーマ：${topic}\n台本と投稿文を生成してください。`,
      },
    ],
  });

  const rawText = response.content[0].text;
  const cleanText = rawText.replace(/```json\n?|\n?```/g, "").trim();

  try {
    const scriptData = JSON.parse(cleanText);

    // テロップが20文字を超えていたら自動で切り詰める
    scriptData.scenes.forEach((scene) => {
      if (scene.caption.length > 20) {
        console.log(`⚠️ シーン${scene.scene_number}のテロップを自動修正しました。`);
        scene.caption = scene.caption.substring(0, 20);
      }
    });

    fs.writeFileSync("output/script.json", JSON.stringify(scriptData, null, 2));
    console.log("✅ 台本生成完了！output/script.json を確認してください。");
    return scriptData;

  } catch (err) {
    console.error("❌ JSONの変換に失敗しました。Claudeの返答：", cleanText);
    throw err;
  }
}

const theme = fs.readFileSync("output/selected_theme.txt", "utf8").trim();
console.log(`📝 テーマ：${theme}`);
generateScript(theme);