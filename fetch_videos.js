require("dotenv").config();
const fs = require("fs");
const path = require("path");
const https = require("https");

const PEXELS_API_KEY = process.env.PEXELS_API_KEY;
const VIDEO_DIR = path.join(__dirname, "remotion", "public", "video");

// 動画をダウンロードする関数
function downloadFile(url, destPath) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(destPath);
    https.get(url, (response) => {
      // リダイレクトの処理
      if (response.statusCode === 302 || response.statusCode === 301) {
        https.get(response.headers.location, (redirectResponse) => {
          redirectResponse.pipe(file);
          file.on("finish", () => {
            file.close();
            resolve();
          });
        }).on("error", reject);
      } else {
        response.pipe(file);
        file.on("finish", () => {
          file.close();
          resolve();
        });
      }
    }).on("error", reject);
  });
}

// Pexels APIで動画を検索してダウンロードする関数
async function fetchVideo(query, sceneNumber) {
  const encodedQuery = encodeURIComponent(query);
  const apiUrl = `https://api.pexels.com/videos/search?query=${encodedQuery}&orientation=portrait&per_page=5`;

  return new Promise((resolve, reject) => {
    const options = {
      hostname: "api.pexels.com",
      path: `/videos/search?query=${encodedQuery}&orientation=portrait&per_page=5`,
      headers: {
        Authorization: PEXELS_API_KEY,
      },
    };

    https.get(options, (response) => {
      let data = "";
      response.on("data", (chunk) => (data += chunk));
      response.on("end", async () => {
        try {
          const result = JSON.parse(data);
          if (!result.videos || result.videos.length === 0) {
            console.log(`⚠️ シーン${sceneNumber}：「${query}」の動画が見つかりませんでした`);
            resolve();
            return;
          }

          // 最初の動画のHD画質URLを取得
          const video = result.videos[0];
          const videoFile = video.video_files.find(
            (f) => f.quality === "hd" && f.width <= 1080
          ) || video.video_files[0];

          const destPath = path.join(VIDEO_DIR, `scene_${sceneNumber}.mp4`);
          console.log(`⬇️ シーン${sceneNumber}「${query}」をダウンロード中...`);
          await downloadFile(videoFile.link, destPath);
          console.log(`✅ シーン${sceneNumber} → scene_${sceneNumber}.mp4`);
          resolve();
        } catch (err) {
          reject(err);
        }
      });
    }).on("error", reject);
  });
}

async function fetchAllVideos() {
  // script.jsonからシーンのキャプションを読み込む
  const scriptData = JSON.parse(
    fs.readFileSync(path.join(__dirname, "output", "script.json"), "utf8")
  );

  // videoフォルダが存在しない場合は作成
  if (!fs.existsSync(VIDEO_DIR)) {
    fs.mkdirSync(VIDEO_DIR, { recursive: true });
  }

  console.log("🎬 背景動画を取得しています...");

  // 各シーンのキャプションをキーワードとして検索
  const searchQueries = [
    "sleeping peaceful",
    "bath relaxing",
    "smartphone night",
    "morning sunlight",
    "sleeping night",
  ];

  for (let i = 0; i < scriptData.scenes.length; i++) {
    const scene = scriptData.scenes[i];
    const query = searchQueries[i] || scene.caption;
    await fetchVideo(query, scene.scene_number);
  }

  console.log("\n🎉 全シーンの背景動画取得完了！");
}

fetchAllVideos();