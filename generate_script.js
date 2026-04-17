require("dotenv").config();
const Anthropic = require("@anthropic-ai/sdk");
const fs = require("fs");

const client = new Anthropic();

async function generateScript(topic, systemPromptFile = "prompts/system_prompt.txt", retryCount = 0) {
  const systemPrompt = fs.readFileSync(systemPromptFile, "utf8");

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
      // ★ assistantターンの先頭を強制的に「{」にしてJSONのみを返させる
      {
        role: "assistant",
        content: "{",
      },
    ],
  });

  // assistantの先頭に「{」を付け足してからパース
  const rawText = "{" + response.content[0].text;

  try {
    const scriptData = JSON.parse(rawText);

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
    console.error("❌ JSONの変換に失敗しました。Claudeの返答：", rawText);

    // 3回までリトライ
    if (retryCount < 3) {
      return generateScript(topic, retryCount + 1);
    }
    throw err;
  }
}

const theme = fs.readFileSync("output/selected_theme.txt", "utf8").trim();
const slot = fs.existsSync("output/slot.txt")
  ? fs.readFileSync("output/slot.txt", "utf8").trim()
  : "evening";
const isMorning = slot === "morning";
const systemPromptFile = isMorning ? "prompts/system_prompt_morning.txt" : "prompts/system_prompt.txt";
console.log(`📝 テーマ：${theme}`);
console.log(`📝 使用プロンプト：${systemPromptFile}`);
generateScript(theme, systemPromptFile);