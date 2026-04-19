require("dotenv").config();
const fs = require("fs");
const https = require("https");

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
          console.log("RAWレスポンス：", JSON.stringify(result, null, 2));
          const comment = result.candidates[0].content.parts[0].text.trim();
          if (comment.length > 200) {
            throw new Error("コメントが異常に長いです：" + comment.length + "文字");
          }
          console.log("💬 生成されたコメント：", comment);
          resolve(comment);
        } catch (err) {
          console.error("❌ エラー:", err.message);
          reject(err);
        }
      });
    });
    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

const scriptData = JSON.parse(fs.readFileSync("output/script.json", "utf8"));
generateComment(scriptData.title, scriptData.post_text).catch(console.error);