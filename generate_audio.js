require("dotenv").config();
const fs = require("fs");
const path = require("path");
const https = require("https");

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const VOICE_ID = "lhTvHflPVOqgSWyuWQry";

async function generateAudio() {
  const usePrepared = process.argv.includes("--use-prepared");
  const scriptFile = usePrepared ? "output/script_for_audio.json" : "output/script.json";
  const rawData = fs.readFileSync(scriptFile, "utf8");
  const scriptData = JSON.parse(rawData);

  const audioDir = path.join("output", "audio");
  if (!fs.existsSync(audioDir)) {
    fs.mkdirSync(audioDir, { recursive: true });
  }

  console.log(`🎙️ ${scriptData.scenes.length}シーンの音声を生成します...`);

  for (const scene of scriptData.scenes) {
    console.log(`🎙️ シーン${scene.scene_number}の音声を生成中...`);

    let processedText;
    if (usePrepared) {
      processedText = scene.narration
        .replace(/\[pause\]/g, "")
        .replace(/\s+/g, " ")
        .trim();
    } else {
      processedText = scene.narration
        .replace(/\[pause\]/g, "")
        .replace(/【([^】]*)】/g, " $1 ")
        .replace(/（[^）]*）/g, "")
        .replace(/\([^)]*\)/g, "")
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
        .trim();
    }

    console.log(`📝 シーン${scene.scene_number}のテキスト：`, processedText);

    const body = JSON.stringify({
      text: processedText,
      model_id: "eleven_v3",
      language_code: "ja",
      apply_text_normalization: "auto",
      voice_settings: {
        stability: 0.4,
        similarity_boost: 0.8,
        style: 0.0,
        speed: 1.2,
      },
      pronunciation_dictionary_locators: [
        {
          pronunciation_dictionary_id: process.env.PRONUNCIATION_DICT_ID,
          version_id: process.env.PRONUNCIATION_DICT_VERSION,
        },
      ],
    });

    const outputPath = path.join(audioDir, `scene_${scene.scene_number}.mp3`);

    await new Promise((resolve, reject) => {
      const options = {
        hostname: "api.elevenlabs.io",
        path: `/v1/text-to-speech/${VOICE_ID}`,
        method: "POST",
        headers: {
          "xi-api-key": ELEVENLABS_API_KEY,
          "Content-Type": "application/json",
          "Accept": "audio/mpeg",
        },
      };

      const req = https.request(options, (res) => {
        const chunks = [];
        res.on("data", (chunk) => chunks.push(chunk));
        res.on("end", () => {
          const buffer = Buffer.concat(chunks);
          if (res.statusCode !== 200) {
            console.error(`❌ エラー (${res.statusCode}):`, buffer.toString());
            resolve();
            return;
          }
          fs.writeFileSync(outputPath, buffer);
          console.log(`✅ シーン${scene.scene_number} → ${outputPath}`);
          resolve();
        });
      });

      req.on("error", reject);
      req.write(body);
      req.end();
    });
  }

  console.log("🎉 全シーンの音声生成完了！");
}

generateAudio();