require("dotenv").config();
const https = require("https");
const fs = require("fs");

const body = JSON.stringify({
  contents: [{
    parts: [{
      text: "A cute 3D animated white pigeon girl character for a YouTube channel icon, Pixar-style rendering, chibi proportion with very large round head and tiny small body (2-head-tall ratio), soft and fluffy white feathers with visible feather texture, big sparkling RED eyes with black eyeliner outline, NO eyebrows, small tuft of feathers sticking up on top of head, NO rosy cheeks, slightly longer pink beak, wearing a colorful striped scarf, cheerful smiling expression, full body visible, 1:1 square aspect ratio, centered composition, simple pastel color background, high quality 3D render"
    }]
  }],
  generationConfig: { responseModalities: ["IMAGE", "TEXT"] }
});

const options = {
  hostname: "generativelanguage.googleapis.com",
  path: `/v1beta/models/gemini-3.1-flash-image-preview:generateContent?key=${process.env.GEMINI_API_KEY}`,
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
          fs.writeFileSync("output/channel_icon.png", Buffer.from(part.inlineData.data, "base64"));
          console.log("✅ output/channel_icon.png に保存しました！");
          return;
        }
      }
      console.log("❌ 画像が生成されませんでした");
    } catch (err) {
      console.error("❌ エラー:", err.message);
    }
  });
});

req.on("error", console.error);
req.write(body);
req.end();
console.log("🎨 チャンネルアイコンを生成中...");