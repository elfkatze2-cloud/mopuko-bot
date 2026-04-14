require("dotenv").config();
const { google } = require("googleapis");
const fs = require("fs");
const path = require("path");
const { authenticate } = require("./auth_youtube");

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

  console.log("📤 YouTubeにアップロード中...");
  console.log("タイトル：", title);

  const response = await youtube.videos.insert({
    part: ["snippet", "status"],
    requestBody: {
      snippet: {
        title: title + " #Shorts",
        description: description,
        tags: ["ショート動画", "shorts"],
        categoryId: "22", // People & Blogs
        defaultLanguage: "ja",
      },
      status: {
        privacyStatus: "private", // まずは非公開でテスト
        selfDeclaredMadeForKids: false,
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
}

uploadVideo();