require("dotenv").config();
const fs = require("fs");
const path = require("path");
const https = require("https");

const TOKEN_PATH = "tiktok_token.json";

async function uploadToTikTok() {
  if (!fs.existsSync(TOKEN_PATH)) {
    console.error("❌ tiktok_token.jsonが見つかりません。先にauth_tiktok.jsを実行してください。");
    process.exit(1);
  }

  const token = JSON.parse(fs.readFileSync(TOKEN_PATH, "utf8"));
  const accessToken = token.access_token;

  const videoPath = path.join(
    "C:\\Users\\elfka\\OneDrive\\デスクトップ\\video-bot\\remotion\\output.mp4"
  );

  if (!fs.existsSync(videoPath)) {
    console.error("❌ 動画ファイルが見つかりません：", videoPath);
    process.exit(1);
  }

  const videoSize = fs.statSync(videoPath).size;
  const scriptData = JSON.parse(fs.readFileSync("output/script.json", "utf8"));
  const title = scriptData.title;

  console.log("📤 TikTokに動画をアップロード中...");
  console.log("タイトル：", title);
  console.log("ファイルサイズ：", videoSize, "bytes");

  // Step1: 初期化
  const initBody = JSON.stringify({
    post_info: {
      title: title + " #Shorts",
      privacy_level: "SELF_ONLY", // Sandboxでは非公開にする
      disable_duet: false,
      disable_comment: false,
      disable_stitch: false,
    },
    source_info: {
      source: "FILE_UPLOAD",
      video_size: videoSize,
      chunk_size: videoSize,
      total_chunk_count: 1,
    },
  });

  const initRes = await new Promise((resolve, reject) => {
    const options = {
      hostname: "open.tiktokapis.com",
      path: "/v2/post/publish/video/init/",
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json; charset=UTF-8",
      },
    };

    const req = https.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        console.log("初期化レスポンス：", data);
        resolve(JSON.parse(data));
      });
    });
    req.on("error", reject);
    req.write(initBody);
    req.end();
  });

  if (!initRes.data?.publish_id || !initRes.data?.upload_url) {
    console.error("❌ 初期化失敗：", initRes);
    return;
  }

  const { publish_id, upload_url } = initRes.data;
  console.log("✅ 初期化成功！publish_id：", publish_id);

  // Step2: 動画アップロード
  const videoData = fs.readFileSync(videoPath);
  const uploadUrl = new URL(upload_url);

  await new Promise((resolve, reject) => {
    const options = {
      hostname: uploadUrl.hostname,
      path: uploadUrl.pathname + uploadUrl.search,
      method: "PUT",
      headers: {
        "Content-Type": "video/mp4",
        "Content-Length": videoSize,
        "Content-Range": `bytes 0-${videoSize - 1}/${videoSize}`,
      },
    };

    const req = https.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        console.log("アップロードレスポンス：", res.statusCode, data);
        resolve();
      });
    });
    req.on("error", reject);
    req.write(videoData);
    req.end();
  });

  console.log("✅ TikTokへのアップロード完了！");
  console.log("publish_id：", publish_id);
}

uploadToTikTok().catch(console.error);